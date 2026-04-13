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
  restoreItemSchema,
  saveDecisionSchema,
  updateDispositionSchema,
  updateItemSchema,
  type SaveDecisionInput,
} from "@/lib/validators";
import { scoreDecision } from "@/lib/predictions";

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

export async function addItem(formData: FormData): Promise<{ itemId: string }> {
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
  const itemId = generateId("itm");
  await db.insert(items).values({
    id: itemId,
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

  return { itemId };
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

export async function saveDecision(input: SaveDecisionInput): Promise<void> {
  const userId = await requireUserId();
  const parsed = saveDecisionSchema.parse(input);
  const { moveId, sourceRoomId } = await assertItemOwnership(parsed.itemId, userId);

  const { score } = scoreDecision(parsed.answers);
  const rounded = Math.round(score * 100) / 100;

  const db = getDb();
  await db
    .update(items)
    .set({
      decisionAnswers: parsed.answers,
      decisionScore: String(rounded),
      ...(parsed.apply ? { disposition: parsed.apply } : {}),
      updatedAt: new Date(),
    })
    .where(eq(items.id, parsed.itemId));

  if (sourceRoomId) revalidatePath(`/${moveId}/inventory/${sourceRoomId}`);
  revalidatePath(`/${moveId}/triage`);
  revalidatePath(`/${moveId}/dashboard`);
  revalidatePath(`/${moveId}/inventory/item/${parsed.itemId}`);
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

export async function restoreItem(itemId: string): Promise<void> {
  const userId = await requireUserId();
  const parsed = restoreItemSchema.parse({ itemId });
  const { moveId, sourceRoomId } = await assertItemOwnership(parsed.itemId, userId);

  const db = getDb();
  await db
    .update(items)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(items.id, parsed.itemId));

  if (sourceRoomId) revalidatePath(`/${moveId}/inventory/${sourceRoomId}`);
  revalidatePath(`/${moveId}/inventory`);
  revalidatePath(`/${moveId}/dashboard`);
}

export async function updateItem(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const parsed = updateItemSchema.parse({
    itemId: formData.get("itemId"),
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    quantity: formData.get("quantity") ?? 1,
    fragility: formData.get("fragility") ?? "normal",
    sourceRoomId: formData.get("sourceRoomId") ?? "",
    destinationRoomId: formData.get("destinationRoomId") ?? "",
    notes: formData.get("notes") ?? "",
    volumeCuFtOverride: formData.get("volumeCuFtOverride") ?? "",
    weightLbsOverride: formData.get("weightLbsOverride") ?? "",
  });
  const { moveId, sourceRoomId: oldRoomId } = await assertItemOwnership(
    parsed.itemId,
    userId,
  );

  const db = getDb();
  await db
    .update(items)
    .set({
      name: parsed.name,
      categoryId: parsed.categoryId,
      quantity: parsed.quantity,
      fragility: parsed.fragility,
      sourceRoomId: parsed.sourceRoomId ?? null,
      destinationRoomId: parsed.destinationRoomId ?? null,
      notes: parsed.notes ?? null,
      volumeCuFtOverride:
        parsed.volumeCuFtOverride !== undefined ? String(parsed.volumeCuFtOverride) : null,
      weightLbsOverride:
        parsed.weightLbsOverride !== undefined ? String(parsed.weightLbsOverride) : null,
      updatedAt: new Date(),
    })
    .where(eq(items.id, parsed.itemId));

  if (oldRoomId) revalidatePath(`/${moveId}/inventory/${oldRoomId}`);
  if (parsed.sourceRoomId && parsed.sourceRoomId !== oldRoomId) {
    revalidatePath(`/${moveId}/inventory/${parsed.sourceRoomId}`);
  }
  revalidatePath(`/${moveId}/inventory`);
  revalidatePath(`/${moveId}/inventory/item/${parsed.itemId}`);
  revalidatePath(`/${moveId}/dashboard`);
}
