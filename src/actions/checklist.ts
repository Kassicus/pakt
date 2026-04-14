"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { requireMoveAccess } from "@/lib/auth/membership";
import { getDb } from "@/db";
import { checklistItems } from "@/db/schema";
import { generateId } from "@/lib/shortcode";
import {
  addChecklistItemSchema,
  deleteChecklistItemSchema,
  toggleChecklistItemSchema,
  updateChecklistItemSchema,
} from "@/lib/validators";

async function moveIdForChecklistItem(itemId: string): Promise<string> {
  const db = getDb();
  const [row] = await db
    .select({ moveId: checklistItems.moveId })
    .from(checklistItems)
    .where(eq(checklistItems.id, itemId))
    .limit(1);
  if (!row) throw new Error("Task not found");
  return row.moveId;
}

export async function addChecklistItem(formData: FormData): Promise<void> {
  const parsed = addChecklistItemSchema.parse({
    moveId: formData.get("moveId"),
    text: formData.get("text"),
    category: formData.get("category"),
  });
  await requireMoveAccess(parsed.moveId, "editor");

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
  const parsed = toggleChecklistItemSchema.parse({
    itemId: formData.get("itemId"),
    done: formData.get("done") ?? "false",
  });
  const moveId = await moveIdForChecklistItem(parsed.itemId);
  await requireMoveAccess(moveId, "helper");

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
  const parsed = updateChecklistItemSchema.parse({
    itemId: formData.get("itemId"),
    text: formData.get("text") ?? undefined,
    category: formData.get("category") ?? undefined,
  });
  const moveId = await moveIdForChecklistItem(parsed.itemId);
  await requireMoveAccess(moveId, "editor");

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
  const parsed = deleteChecklistItemSchema.parse({
    itemId: formData.get("itemId"),
  });
  const moveId = await moveIdForChecklistItem(parsed.itemId);
  await requireMoveAccess(moveId, "editor");

  const db = getDb();
  await db.delete(checklistItems).where(eq(checklistItems.id, parsed.itemId));

  revalidatePath(`/${moveId}/checklist`);
}
