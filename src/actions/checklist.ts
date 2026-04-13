"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { checklistItems, moves } from "@/db/schema";
import { generateId } from "@/lib/shortcode";
import {
  addChecklistItemSchema,
  deleteChecklistItemSchema,
  toggleChecklistItemSchema,
  updateChecklistItemSchema,
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

async function assertItemOwnership(itemId: string, userId: string) {
  const db = getDb();
  const [row] = await db
    .select({ moveId: checklistItems.moveId })
    .from(checklistItems)
    .innerJoin(moves, eq(moves.id, checklistItems.moveId))
    .where(and(eq(checklistItems.id, itemId), eq(moves.ownerUserId, userId)))
    .limit(1);
  if (!row) throw new Error("Task not found");
  return row.moveId;
}

export async function addChecklistItem(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const parsed = addChecklistItemSchema.parse({
    moveId: formData.get("moveId"),
    text: formData.get("text"),
    category: formData.get("category"),
  });
  await assertMoveOwnership(parsed.moveId, userId);

  const db = getDb();
  const [top] = await db
    .select({ maxSort: checklistItems.sortOrder })
    .from(checklistItems)
    .where(
      and(
        eq(checklistItems.moveId, parsed.moveId),
        eq(checklistItems.category, parsed.category),
      ),
    )
    .orderBy(desc(checklistItems.sortOrder))
    .limit(1);

  await db.insert(checklistItems).values({
    id: generateId("chk"),
    moveId: parsed.moveId,
    text: parsed.text,
    category: parsed.category,
    sortOrder: (top?.maxSort ?? 0) + 10,
  });

  revalidatePath(`/${parsed.moveId}/checklist`);
}

export async function toggleChecklistItem(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const parsed = toggleChecklistItemSchema.parse({
    itemId: formData.get("itemId"),
    done: formData.get("done") ?? "false",
  });
  const moveId = await assertItemOwnership(parsed.itemId, userId);

  const db = getDb();
  await db
    .update(checklistItems)
    .set({
      doneAt: parsed.done ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(checklistItems.id, parsed.itemId));

  revalidatePath(`/${moveId}/checklist`);
}

export async function updateChecklistItem(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const parsed = updateChecklistItemSchema.parse({
    itemId: formData.get("itemId"),
    text: formData.get("text") ?? undefined,
    category: formData.get("category") ?? undefined,
  });
  const moveId = await assertItemOwnership(parsed.itemId, userId);

  const db = getDb();
  await db
    .update(checklistItems)
    .set({
      ...(parsed.text !== undefined ? { text: parsed.text } : {}),
      ...(parsed.category !== undefined ? { category: parsed.category } : {}),
      updatedAt: new Date(),
    })
    .where(eq(checklistItems.id, parsed.itemId));

  revalidatePath(`/${moveId}/checklist`);
}

export async function deleteChecklistItem(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const parsed = deleteChecklistItemSchema.parse({
    itemId: formData.get("itemId"),
  });
  const moveId = await assertItemOwnership(parsed.itemId, userId);

  const db = getDb();
  await db.delete(checklistItems).where(eq(checklistItems.id, parsed.itemId));

  revalidatePath(`/${moveId}/checklist`);
}
