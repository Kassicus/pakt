"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { moves, rooms, users } from "@/db/schema";
import { generateId } from "@/lib/shortcode";
import { createMoveSchema, DEFAULT_ROOMS } from "@/lib/validators";
import { currentUser } from "@clerk/nextjs/server";

async function ensureUserRow(userId: string) {
  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.clerkUserId, userId)).limit(1);
  if (existing.length > 0) return;
  const user = await currentUser();
  await db
    .insert(users)
    .values({
      clerkUserId: userId,
      email: user?.emailAddresses[0]?.emailAddress ?? "unknown@example.com",
      displayName: user?.firstName ?? user?.username ?? null,
    })
    .onConflictDoNothing();
}

export async function createMove(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const parsed = createMoveSchema.safeParse({
    name: formData.get("name"),
    originAddress: formData.get("originAddress") ?? "",
    destinationAddress: formData.get("destinationAddress") ?? "",
    plannedMoveDate: formData.get("plannedMoveDate") ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  await ensureUserRow(userId);

  const db = getDb();
  const moveId = generateId("mov");
  await db.insert(moves).values({
    id: moveId,
    ownerClerkUserId: userId,
    name: parsed.data.name,
    originAddress: parsed.data.originAddress || null,
    destinationAddress: parsed.data.destinationAddress || null,
    plannedMoveDate: parsed.data.plannedMoveDate || null,
  });

  await db.insert(rooms).values(
    DEFAULT_ROOMS.flatMap((label, idx) => [
      { id: generateId("rm"), moveId, kind: "origin" as const, label, sortOrder: idx * 10 },
      { id: generateId("rm"), moveId, kind: "destination" as const, label, sortOrder: idx * 10 },
    ]),
  );

  revalidatePath("/moves");
  redirect(`/${moveId}/dashboard`);
}

export async function deleteMove(moveId: string) {
  const userId = await requireUserId();
  const db = getDb();
  await db
    .delete(moves)
    .where(and(eq(moves.id, moveId), eq(moves.ownerClerkUserId, userId)));
  revalidatePath("/moves");
}
