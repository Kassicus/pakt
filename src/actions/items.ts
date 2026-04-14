"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { requireMoveAccess } from "@/lib/auth/membership";
import { getDb } from "@/db";
import { items } from "@/db/schema";
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

async function itemContext(itemId: string) {
  const db = getDb();
  const [row] = await db
    .select({ moveId: items.moveId, sourceRoomId: items.sourceRoomId })
    .from(items)
    .where(eq(items.id, itemId))
    .limit(1);
  if (!row) throw new Error("Item not found");
  return row;
}

export async function addItem(formData: FormData): Promise<{ itemId: string }> {
  const parsed = addItemSchema.parse({
    moveId: formData.get("moveId"),
    sourceRoomId: formData.get("sourceRoomId"),
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    quantity: formData.get("quantity") ?? 1,
    disposition: formData.get("disposition") ?? "undecided",
    fragility: formData.get("fragility") ?? "normal",
    notes: formData.get("notes") ?? "",
    clientItemId: formData.get("clientItemId") ?? "",
  });
  const { userId } = await requireMoveAccess(parsed.moveId, "editor");

  const db = getDb();
  const itemId = parsed.clientItemId ?? generateId("itm");
  await db
    .insert(items)
    .values({
      id: itemId,
      moveId: parsed.moveId,
      ownerUserId: userId,
      name: parsed.name,
      categoryId: parsed.categoryId,
      sourceRoomId: parsed.sourceRoomId,
      quantity: parsed.quantity,
      disposition: parsed.disposition,
      fragility: parsed.fragility,
      notes: parsed.notes || null,
    })
    .onConflictDoNothing({ target: items.id });

  revalidatePath(`/${parsed.moveId}/inventory/${parsed.sourceRoomId}`);
  revalidatePath(`/${parsed.moveId}/inventory`);
  revalidatePath(`/${parsed.moveId}/dashboard`);

  return { itemId };
}

export async function updateDisposition(formData: FormData): Promise<void> {
  const parsed = updateDispositionSchema.parse({
    itemId: formData.get("itemId"),
    disposition: formData.get("disposition"),
  });
  const { moveId, sourceRoomId } = await itemContext(parsed.itemId);
  await requireMoveAccess(moveId, "editor");

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
  const parsed = saveDecisionSchema.parse(input);
  const { moveId, sourceRoomId } = await itemContext(parsed.itemId);
  await requireMoveAccess(moveId, "editor");

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
  const parsed = deleteItemSchema.parse({ itemId: formData.get("itemId") });
  const { moveId, sourceRoomId } = await itemContext(parsed.itemId);
  await requireMoveAccess(moveId, "editor");

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
  const parsed = restoreItemSchema.parse({ itemId });
  const { moveId, sourceRoomId } = await itemContext(parsed.itemId);
  await requireMoveAccess(moveId, "editor");

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
  const { moveId, sourceRoomId: oldRoomId } = await itemContext(parsed.itemId);
  await requireMoveAccess(moveId, "editor");

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

// Reserved for unused-warning suppression (requireUserId still used by other callers).
void requireUserId;
