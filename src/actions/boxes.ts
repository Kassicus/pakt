"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { requireMoveAccess } from "@/lib/auth/membership";
import { getDb } from "@/db";
import { boxItems, boxTypes, boxes, items } from "@/db/schema";
import { generateBoxShortCode, generateId } from "@/lib/shortcode";
import {
  addItemsToBoxSchema,
  createBoxSchema,
  deleteBoxSchema,
  removeItemFromBoxSchema,
  updateBoxStatusSchema,
} from "@/lib/validators";

async function boxContext(boxId: string) {
  const db = getDb();
  const [row] = await db
    .select({ moveId: boxes.moveId, shortCode: boxes.shortCode })
    .from(boxes)
    .where(eq(boxes.id, boxId))
    .limit(1);
  if (!row) throw new Error("Box not found");
  return row;
}

async function allocateShortCode(moveId: string): Promise<string> {
  const db = getDb();
  for (let i = 0; i < 5; i++) {
    const code = generateBoxShortCode();
    const existing = await db
      .select({ id: boxes.id })
      .from(boxes)
      .where(and(eq(boxes.moveId, moveId), eq(boxes.shortCode, code)))
      .limit(1);
    if (existing.length === 0) return code;
  }
  throw new Error("Couldn't allocate a unique box code — try again");
}

export async function createBox(formData: FormData): Promise<void> {
  const parsed = createBoxSchema.parse({
    moveId: formData.get("moveId"),
    boxTypeId: formData.get("boxTypeId"),
    sourceRoomId: formData.get("sourceRoomId") ?? "",
    destinationRoomId: formData.get("destinationRoomId") ?? "",
    tags: formData.getAll("tags"),
    notes: formData.get("notes") ?? "",
  });
  const { userId } = await requireMoveAccess(parsed.moveId, "editor");

  const db = getDb();

  const [boxType] = await db
    .select({ id: boxTypes.id, moveId: boxTypes.moveId })
    .from(boxTypes)
    .where(eq(boxTypes.id, parsed.boxTypeId))
    .limit(1);
  if (!boxType || boxType.moveId !== parsed.moveId) {
    throw new Error("Pick a box type from this move.");
  }

  const boxId = generateId("box");
  const shortCode = await allocateShortCode(parsed.moveId);

  await db.insert(boxes).values({
    id: boxId,
    moveId: parsed.moveId,
    ownerUserId: userId,
    shortCode,
    boxTypeId: parsed.boxTypeId,
    sourceRoomId: parsed.sourceRoomId || null,
    destinationRoomId: parsed.destinationRoomId || null,
    tags: parsed.tags,
    notes: parsed.notes || null,
  });

  revalidatePath(`/${parsed.moveId}/boxes`);
  revalidatePath(`/${parsed.moveId}/dashboard`);
  redirect(`/${parsed.moveId}/boxes/${boxId}`);
}

export async function addItemsToBox(boxId: string, itemIds: string[]): Promise<void> {
  const parsed = addItemsToBoxSchema.parse({ boxId, itemIds });
  const { moveId } = await boxContext(parsed.boxId);
  await requireMoveAccess(moveId, "helper");

  const db = getDb();
  // Items must belong to the same move; per-item ownership is now membership-derived.
  const eligibleItems = await db
    .select({ id: items.id })
    .from(items)
    .where(and(inArray(items.id, parsed.itemIds), eq(items.moveId, moveId)));
  const allowed = new Set(eligibleItems.map((i) => i.id));
  const toInsert = parsed.itemIds
    .filter((id) => allowed.has(id))
    .map((id) => ({ id: generateId("bi"), boxId: parsed.boxId, itemId: id, quantity: 1 }));

  if (toInsert.length > 0) {
    await db.insert(boxItems).values(toInsert).onConflictDoNothing();
  }

  const [current] = await db
    .select({ status: boxes.status })
    .from(boxes)
    .where(eq(boxes.id, parsed.boxId))
    .limit(1);
  if (current?.status === "empty") {
    await db
      .update(boxes)
      .set({ status: "packing", updatedAt: new Date() })
      .where(eq(boxes.id, parsed.boxId));
  }

  revalidatePath(`/${moveId}/boxes/${parsed.boxId}`);
  revalidatePath(`/${moveId}/boxes`);
  revalidatePath(`/${moveId}/pack/${parsed.boxId}`);
  revalidatePath(`/${moveId}/dashboard`);
}

export async function removeItemFromBox(boxId: string, itemId: string): Promise<void> {
  const parsed = removeItemFromBoxSchema.parse({ boxId, itemId });
  const { moveId } = await boxContext(parsed.boxId);
  await requireMoveAccess(moveId, "helper");

  const db = getDb();
  await db
    .delete(boxItems)
    .where(and(eq(boxItems.boxId, parsed.boxId), eq(boxItems.itemId, parsed.itemId)));

  const remaining = await db
    .select({ id: boxItems.id })
    .from(boxItems)
    .where(eq(boxItems.boxId, parsed.boxId))
    .limit(1);

  if (remaining.length === 0) {
    const [current] = await db
      .select({ status: boxes.status })
      .from(boxes)
      .where(eq(boxes.id, parsed.boxId))
      .limit(1);
    if (current && ["delivered", "in_transit", "loaded"].includes(current.status)) {
      await db
        .update(boxes)
        .set({ status: "unpacked", updatedAt: new Date() })
        .where(eq(boxes.id, parsed.boxId));
    }
  }

  revalidatePath(`/${moveId}/boxes/${parsed.boxId}`);
  revalidatePath(`/${moveId}/pack/${parsed.boxId}`);
  revalidatePath(`/${moveId}/unpack/${parsed.boxId}`);
  revalidatePath(`/${moveId}/dashboard`);
}

export async function updateBoxStatus(boxId: string, status: string): Promise<void> {
  const parsed = updateBoxStatusSchema.parse({ boxId, status });
  const { moveId } = await boxContext(parsed.boxId);
  await requireMoveAccess(moveId, "helper");

  const db = getDb();
  await db
    .update(boxes)
    .set({ status: parsed.status, updatedAt: new Date() })
    .where(eq(boxes.id, parsed.boxId));

  revalidatePath(`/${moveId}/boxes/${parsed.boxId}`);
  revalidatePath(`/${moveId}/boxes`);
  revalidatePath(`/${moveId}/pack/${parsed.boxId}`);
  revalidatePath(`/${moveId}/unpack/${parsed.boxId}`);
  revalidatePath(`/${moveId}/dashboard`);
}

export async function deleteBox(boxId: string): Promise<void> {
  const parsed = deleteBoxSchema.parse({ boxId });
  const { moveId } = await boxContext(parsed.boxId);
  await requireMoveAccess(moveId, "editor");

  const db = getDb();
  await db
    .update(boxes)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(boxes.id, parsed.boxId));

  revalidatePath(`/${moveId}/boxes`);
  revalidatePath(`/${moveId}/dashboard`);
  redirect(`/${moveId}/boxes`);
}
