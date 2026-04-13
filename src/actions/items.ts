"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { items, moves } from "@/db/schema";
import { generateId } from "@/lib/shortcode";
import {
  addItemSchema,
  deleteItemSchema,
  updateDispositionSchema,
} from "@/lib/validators";

async function assertMoveOwnership(moveId: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: moves.id })
    .from(moves)
    .where(and(eq(moves.id, moveId), eq(moves.ownerClerkUserId, userId)))
    .limit(1);
  if (!row) throw new Error("Move not found");
}

async function assertItemOwnership(itemId: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .select({ moveId: items.moveId, sourceRoomId: items.sourceRoomId })
    .from(items)
    .where(and(eq(items.id, itemId), eq(items.ownerClerkUserId, userId)))
    .limit(1);
  if (!row) throw new Error("Item not found");
  return row;
}

export async function addItem(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const parsed = addItemSchema.parse({
    moveId: formData.get("moveId"),
    sourceRoomId: formData.get("sourceRoomId"),
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    quantity: formData.get("quantity") ?? 1,
    disposition: formData.get("disposition") ?? "undecided",
    fragility: formData.get("fragility") ?? "normal",
    notes: formData.get("notes") ?? "",
  });
  await assertMoveOwnership(parsed.moveId, userId);

  const db = getDb();
  await db.insert(items).values({
    id: generateId("itm"),
    moveId: parsed.moveId,
    ownerClerkUserId: userId,
    name: parsed.name,
    categoryId: parsed.categoryId,
    sourceRoomId: parsed.sourceRoomId,
    quantity: parsed.quantity,
    disposition: parsed.disposition,
    fragility: parsed.fragility,
    notes: parsed.notes || null,
  });

  revalidatePath(`/${parsed.moveId}/inventory/${parsed.sourceRoomId}`);
  revalidatePath(`/${parsed.moveId}/inventory`);
  revalidatePath(`/${parsed.moveId}/dashboard`);
}

export async function updateDisposition(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const parsed = updateDispositionSchema.parse({
    itemId: formData.get("itemId"),
    disposition: formData.get("disposition"),
  });
  const { moveId, sourceRoomId } = await assertItemOwnership(parsed.itemId, userId);

  const db = getDb();
  await db
    .update(items)
    .set({ disposition: parsed.disposition, updatedAt: new Date() })
    .where(eq(items.id, parsed.itemId));

  if (sourceRoomId) revalidatePath(`/${moveId}/inventory/${sourceRoomId}`);
  revalidatePath(`/${moveId}/inventory`);
  revalidatePath(`/${moveId}/dashboard`);
}

export async function deleteItem(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const parsed = deleteItemSchema.parse({ itemId: formData.get("itemId") });
  const { moveId, sourceRoomId } = await assertItemOwnership(parsed.itemId, userId);

  const db = getDb();
  await db
    .update(items)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(items.id, parsed.itemId));

  if (sourceRoomId) revalidatePath(`/${moveId}/inventory/${sourceRoomId}`);
  revalidatePath(`/${moveId}/inventory`);
  revalidatePath(`/${moveId}/dashboard`);
}
