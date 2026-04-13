"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
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

  const [top] = await db
    .select({ maxSort: rooms.sortOrder })
    .from(rooms)
    .where(and(eq(rooms.moveId, parsed.moveId), eq(rooms.kind, parsed.kind)))
    .orderBy(desc(rooms.sortOrder))
    .limit(1);

  try {
    await db.insert(rooms).values({
      id: generateId("rm"),
      moveId: parsed.moveId,
      kind: parsed.kind,
      label: parsed.label,
      parentRoomId: parsed.parentRoomId ?? null,
      sortOrder: (top?.maxSort ?? 0) + 10,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("rooms_unique_label") || msg.includes("duplicate key")) {
      throw new Error(
        `A room named "${parsed.label}" already exists here. Pick a different name.`,
      );
    }
    throw err;
  }

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

export async function mirrorOriginToDestination(
  moveId: string,
): Promise<{ added: number; skipped: number }> {
  const userId = await requireUserId();
  await assertMoveOwnership(moveId, userId);

  const db = getDb();
  const originRooms = await db
    .select({
      id: rooms.id,
      label: rooms.label,
      parentRoomId: rooms.parentRoomId,
      sortOrder: rooms.sortOrder,
    })
    .from(rooms)
    .where(and(eq(rooms.moveId, moveId), eq(rooms.kind, "origin")))
    .orderBy(rooms.sortOrder);

  if (originRooms.length === 0) {
    return { added: 0, skipped: 0 };
  }

  // Existing destination top-level labels — skip to avoid duplicate-key errors.
  const existingDest = await db
    .select({ label: rooms.label, parentRoomId: rooms.parentRoomId })
    .from(rooms)
    .where(and(eq(rooms.moveId, moveId), eq(rooms.kind, "destination")));
  const existingTopLabels = new Set(
    existingDest
      .filter((r) => !r.parentRoomId)
      .map((r) => r.label.toLowerCase()),
  );

  type Insert = {
    id: string;
    moveId: string;
    kind: "destination";
    label: string;
    parentRoomId: string | null;
    sortOrder: number;
  };

  const idMap = new Map<string, string>();
  const topLevelInserts: Insert[] = [];
  let skipped = 0;

  for (const r of originRooms.filter((r) => !r.parentRoomId)) {
    if (existingTopLabels.has(r.label.toLowerCase())) {
      skipped += 1;
      continue;
    }
    const newId = generateId("rm");
    idMap.set(r.id, newId);
    topLevelInserts.push({
      id: newId,
      moveId,
      kind: "destination",
      label: r.label,
      parentRoomId: null,
      sortOrder: r.sortOrder,
    });
  }
  if (topLevelInserts.length > 0) {
    await db.insert(rooms).values(topLevelInserts);
  }

  const subRoomInserts: Insert[] = [];
  for (const r of originRooms.filter((r) => r.parentRoomId)) {
    const newParentId = r.parentRoomId ? idMap.get(r.parentRoomId) : null;
    if (!newParentId) {
      skipped += 1;
      continue;
    }
    subRoomInserts.push({
      id: generateId("rm"),
      moveId,
      kind: "destination",
      label: r.label,
      parentRoomId: newParentId,
      sortOrder: r.sortOrder,
    });
  }
  if (subRoomInserts.length > 0) {
    await db.insert(rooms).values(subRoomInserts);
  }

  revalidatePath(`/${moveId}`, "layout");
  return {
    added: topLevelInserts.length + subRoomInserts.length,
    skipped,
  };
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
