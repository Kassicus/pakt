"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { boxItems, boxes, items, moves } from "@/db/schema";
import { generateBoxShortCode, generateId } from "@/lib/shortcode";
import {
  addItemsToBoxSchema,
  createBoxSchema,
  deleteBoxSchema,
  removeItemFromBoxSchema,
  updateBoxStatusSchema,
} from "@/lib/validators";

async function assertMoveOwnership(moveId: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: moves.id })
    .from(moves)
    .where(and(eq(moves.id, moveId), eq(moves.ownerUserId, userId)))
    .limit(1);
  if (!row) throw new Error("Move not found");
}

async function assertBoxOwnership(boxId: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .select({ moveId: boxes.moveId, shortCode: boxes.shortCode })
    .from(boxes)
    .where(and(eq(boxes.id, boxId), eq(boxes.ownerUserId, userId)))
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
  const userId = await requireUserId();
  const parsed = createBoxSchema.parse({
    moveId: formData.get("moveId"),
    size: formData.get("size"),
    sourceRoomId: formData.get("sourceRoomId") ?? "",
    destinationRoomId: formData.get("destinationRoomId") ?? "",
    fragile: formData.get("fragile") ?? undefined,
    notes: formData.get("notes") ?? "",
  });
  await assertMoveOwnership(parsed.moveId, userId);

  const db = getDb();
  const boxId = generateId("box");
  const shortCode = await allocateShortCode(parsed.moveId);

  await db.insert(boxes).values({
    id: boxId,
    moveId: parsed.moveId,
    ownerUserId: userId,
    shortCode,
    size: parsed.size,
    sourceRoomId: parsed.sourceRoomId || null,
    destinationRoomId: parsed.destinationRoomId || null,
    fragile: parsed.fragile ?? false,
    notes: parsed.notes || null,
  });

  revalidatePath(`/${parsed.moveId}/boxes`);
  revalidatePath(`/${parsed.moveId}/dashboard`);
  redirect(`/${parsed.moveId}/boxes/${boxId}`);
}

export async function addItemsToBox(boxId: string, itemIds: string[]): Promise<void> {
  const userId = await requireUserId();
  const parsed = addItemsToBoxSchema.parse({ boxId, itemIds });
  const { moveId } = await assertBoxOwnership(parsed.boxId, userId);

  const db = getDb();
  const ownedItems = await db
    .select({ id: items.id })
    .from(items)
    .where(
      and(
        inArray(items.id, parsed.itemIds),
        eq(items.moveId, moveId),
        eq(items.ownerUserId, userId),
      ),
    );
  const allowed = new Set(ownedItems.map((i) => i.id));
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
  const userId = await requireUserId();
  const parsed = removeItemFromBoxSchema.parse({ boxId, itemId });
  const { moveId } = await assertBoxOwnership(parsed.boxId, userId);

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
  const userId = await requireUserId();
  const parsed = updateBoxStatusSchema.parse({ boxId, status });
  const { moveId } = await assertBoxOwnership(parsed.boxId, userId);

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
  const userId = await requireUserId();
  const parsed = deleteBoxSchema.parse({ boxId });
  const { moveId } = await assertBoxOwnership(parsed.boxId, userId);

  const db = getDb();
  await db
    .update(boxes)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(boxes.id, parsed.boxId));

  revalidatePath(`/${moveId}/boxes`);
  revalidatePath(`/${moveId}/dashboard`);
  redirect(`/${moveId}/boxes`);
}
