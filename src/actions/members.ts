"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull, gt } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { getUserIdOrNull, requireUserId } from "@/lib/auth";
import { requireMoveAccess, type MoveRole } from "@/lib/auth/membership";
import { getDb } from "@/db";
import { moveInvitations, moveMembers, moves } from "@/db/schema";
import { generateId, generateInviteToken } from "@/lib/shortcode";

const inviteSchema = z.object({
  moveId: z.string().min(1),
  email: z.string().email().max(254),
  role: z.enum(["editor", "helper"]),
});

export async function inviteMember(input: {
  moveId: string;
  email: string;
  role: "editor" | "helper";
}): Promise<{ token: string; url: string }> {
  const parsed = inviteSchema.parse(input);
  const { userId } = await requireMoveAccess(parsed.moveId, "owner");

  const db = getDb();
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  await db.insert(moveInvitations).values({
    id: generateId("inv"),
    moveId: parsed.moveId,
    email: parsed.email.toLowerCase(),
    role: parsed.role,
    token,
    invitedByUserId: userId,
    expiresAt,
  });

  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const url = `${proto}://${host}/invites/${token}`;

  revalidatePath(`/${parsed.moveId}/members`);
  return { token, url };
}

export async function revokeInvitation(invitationId: string): Promise<void> {
  const db = getDb();
  const [inv] = await db
    .select({ moveId: moveInvitations.moveId })
    .from(moveInvitations)
    .where(eq(moveInvitations.id, invitationId))
    .limit(1);
  if (!inv) throw new Error("Invitation not found");
  await requireMoveAccess(inv.moveId, "owner");

  await db.delete(moveInvitations).where(eq(moveInvitations.id, invitationId));
  revalidatePath(`/${inv.moveId}/members`);
}

export async function removeMember(input: {
  moveId: string;
  userId: string;
}): Promise<void> {
  const { userId: callerId } = await requireMoveAccess(input.moveId, "owner");
  if (callerId === input.userId) {
    throw new Error("Owners can't remove themselves. Delete the move instead.");
  }
  const db = getDb();
  await db
    .delete(moveMembers)
    .where(
      and(
        eq(moveMembers.moveId, input.moveId),
        eq(moveMembers.userId, input.userId),
      ),
    );
  revalidatePath(`/${input.moveId}/members`);
}

export async function changeMemberRole(input: {
  moveId: string;
  userId: string;
  role: MoveRole;
}): Promise<void> {
  const { userId: callerId } = await requireMoveAccess(input.moveId, "owner");
  if (callerId === input.userId) {
    throw new Error("You can't change your own role.");
  }
  if (input.role === "owner") {
    throw new Error("Transferring ownership isn't supported yet.");
  }
  const db = getDb();
  await db
    .update(moveMembers)
    .set({ role: input.role })
    .where(
      and(
        eq(moveMembers.moveId, input.moveId),
        eq(moveMembers.userId, input.userId),
      ),
    );
  revalidatePath(`/${input.moveId}/members`);
}

export async function leaveMove(moveId: string): Promise<void> {
  const { userId, role } = await requireMoveAccess(moveId, "helper");
  if (role === "owner") {
    throw new Error("Owners can't leave. Delete the move instead.");
  }
  const db = getDb();
  await db
    .delete(moveMembers)
    .where(and(eq(moveMembers.moveId, moveId), eq(moveMembers.userId, userId)));
  revalidatePath("/moves");
  redirect("/moves");
}

export async function acceptInvitation(token: string): Promise<void> {
  const userId = await requireUserId();
  const db = getDb();
  const now = new Date();

  const [inv] = await db
    .select({
      id: moveInvitations.id,
      moveId: moveInvitations.moveId,
      role: moveInvitations.role,
    })
    .from(moveInvitations)
    .where(
      and(
        eq(moveInvitations.token, token),
        isNull(moveInvitations.acceptedAt),
        gt(moveInvitations.expiresAt, now),
      ),
    )
    .limit(1);

  if (!inv) {
    throw new Error("This invitation is no longer valid.");
  }

  // If the user is already a member, just send them to the dashboard.
  const [existing] = await db
    .select({ id: moveMembers.id })
    .from(moveMembers)
    .where(
      and(eq(moveMembers.moveId, inv.moveId), eq(moveMembers.userId, userId)),
    )
    .limit(1);

  if (!existing) {
    await db.insert(moveMembers).values({
      id: generateId("mmb"),
      moveId: inv.moveId,
      userId,
      role: inv.role,
    });
  }

  await db
    .update(moveInvitations)
    .set({ acceptedAt: now, acceptedByUserId: userId })
    .where(eq(moveInvitations.id, inv.id));

  revalidatePath("/moves");
  revalidatePath(`/${inv.moveId}/members`);
  redirect(`/${inv.moveId}/dashboard`);
}

// Re-exposed for the accept page to render an inviter/move preview without
// requiring auth or membership.
export async function getInvitationPreview(token: string): Promise<{
  moveId: string;
  moveName: string;
  inviterUserId: string;
  role: MoveRole;
  email: string;
  state: "valid" | "expired" | "accepted" | "missing";
} | null> {
  const db = getDb();
  const [row] = await db
    .select({
      moveId: moveInvitations.moveId,
      moveName: moves.name,
      inviterUserId: moveInvitations.invitedByUserId,
      role: moveInvitations.role,
      email: moveInvitations.email,
      acceptedAt: moveInvitations.acceptedAt,
      expiresAt: moveInvitations.expiresAt,
    })
    .from(moveInvitations)
    .innerJoin(moves, eq(moves.id, moveInvitations.moveId))
    .where(eq(moveInvitations.token, token))
    .limit(1);

  if (!row) return null;

  const now = new Date();
  let state: "valid" | "expired" | "accepted" | "missing" = "valid";
  if (row.acceptedAt) state = "accepted";
  else if (row.expiresAt < now) state = "expired";

  return {
    moveId: row.moveId,
    moveName: row.moveName,
    inviterUserId: row.inviterUserId,
    role: row.role,
    email: row.email,
    state,
  };
}

// Suppress unused warning where util is imported elsewhere.
void getUserIdOrNull;
