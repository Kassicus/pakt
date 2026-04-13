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
    .where(and(eq(moves.id, moveId), eq(moves.ownerUserId, userId)))
    .limit(1);
  if (!row) throw new Error("Move not found");
}

async function assertRoomOwnership(roomId: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .select({ moveId: rooms.moveId })
    .from(rooms)
    .innerJoin(moves, eq(moves.id, rooms.moveId))
    .where(and(eq(rooms.id, roomId), eq(moves.ownerUserId, userId)))
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
    parentRoomId: formData.get("parentRoomId") ?? "",
  });
  await assertMoveOwnership(parsed.moveId, userId);

  const db = getDb();

  // If a parent is specified, verify it belongs to this move and is the same kind.
  if (parsed.parentRoomId) {
    const [parent] = await db
      .select({ id: rooms.id, kind: rooms.kind })
      .from(rooms)
      .where(and(eq(rooms.id, parsed.parentRoomId), eq(rooms.moveId, parsed.moveId)))
      .limit(1);
    if (!parent) throw new Error("Parent room not found");
    if (parent.kind !== parsed.kind) {
      throw new Error("Parent room must be on the same side (origin/destination)");
    }
  }

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
      parentRoomId: parsed.parentRoomId ?? null,
      sortOrder: (maxSort ?? 0) + 10,
    })
    .onConflictDoNothing();

  revalidatePath(`/${parsed.moveId}`, "layout");
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

  revalidatePath(`/${moveId}`, "layout");
}

export async function deleteRoom(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const parsed = deleteRoomSchema.parse({ roomId: formData.get("roomId") });
  const moveId = await assertRoomOwnership(parsed.roomId, userId);

  const db = getDb();

  // Promote any child rooms (closets) to top-level before deleting the parent
  // so they don't end up with a dangling parent reference.
  await db
    .update(rooms)
    .set({ parentRoomId: null, updatedAt: new Date() })
    .where(eq(rooms.parentRoomId, parsed.roomId));

  // Items with this room as source/destination have ON DELETE SET NULL
  // at the schema level, so they're preserved (just without a room pointer).
  await db.delete(rooms).where(eq(rooms.id, parsed.roomId));

  revalidatePath(`/${moveId}`, "layout");
}
