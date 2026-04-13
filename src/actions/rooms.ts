"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { moves, rooms } from "@/db/schema";
import { generateId } from "@/lib/shortcode";
import { addRoomSchema, renameRoomSchema, deleteRoomSchema } from "@/lib/validators";

async function assertMoveOwnership(moveId: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: moves.id })
    .from(moves)
    .where(and(eq(moves.id, moveId), eq(moves.ownerClerkUserId, userId)))
    .limit(1);
  if (!row) throw new Error("Move not found");
}

async function assertRoomOwnership(roomId: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .select({ moveId: rooms.moveId })
    .from(rooms)
    .innerJoin(moves, eq(moves.id, rooms.moveId))
    .where(and(eq(rooms.id, roomId), eq(moves.ownerClerkUserId, userId)))
    .limit(1);
  if (!row) throw new Error("Room not found");
  return row.moveId;
}

export async function addRoom(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const parsed = addRoomSchema.parse({
    moveId: formData.get("moveId"),
    kind: formData.get("kind") ?? "origin",
    label: formData.get("label"),
  });
  await assertMoveOwnership(parsed.moveId, userId);

  const db = getDb();
  const [{ maxSort } = { maxSort: 0 }] = await db
    .select({ maxSort: rooms.sortOrder })
    .from(rooms)
    .where(and(eq(rooms.moveId, parsed.moveId), eq(rooms.kind, parsed.kind)))
    .orderBy(rooms.sortOrder);

  await db
    .insert(rooms)
    .values({
      id: generateId("rm"),
      moveId: parsed.moveId,
      kind: parsed.kind,
      label: parsed.label,
      sortOrder: (maxSort ?? 0) + 10,
    })
    .onConflictDoNothing();

  revalidatePath(`/${parsed.moveId}/inventory`);
  revalidatePath(`/${parsed.moveId}/dashboard`);
}

export async function renameRoom(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const parsed = renameRoomSchema.parse({
    roomId: formData.get("roomId"),
    label: formData.get("label"),
  });
  const moveId = await assertRoomOwnership(parsed.roomId, userId);

  const db = getDb();
  await db
    .update(rooms)
    .set({ label: parsed.label, updatedAt: new Date() })
    .where(eq(rooms.id, parsed.roomId));

  revalidatePath(`/${moveId}/inventory`);
}

export async function deleteRoom(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const parsed = deleteRoomSchema.parse({ roomId: formData.get("roomId") });
  const moveId = await assertRoomOwnership(parsed.roomId, userId);

  const db = getDb();
  await db.delete(rooms).where(eq(rooms.id, parsed.roomId));

  revalidatePath(`/${moveId}/inventory`);
  revalidatePath(`/${moveId}/dashboard`);
}
