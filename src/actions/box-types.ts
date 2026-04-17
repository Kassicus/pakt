"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { requireMoveAccess } from "@/lib/auth/membership";
import { getDb } from "@/db";
import { boxTypes, boxes } from "@/db/schema";
import { generateId } from "@/lib/shortcode";
import {
  createBoxTypeSchema,
  deleteBoxTypeSchema,
  updateBoxTypeSchema,
} from "@/lib/validators";

async function moveIdForBoxType(boxTypeId: string): Promise<string> {
  const db = getDb();
  const [row] = await db
    .select({ moveId: boxTypes.moveId })
    .from(boxTypes)
    .where(eq(boxTypes.id, boxTypeId))
    .limit(1);
  if (!row) throw new Error("Box type not found");
  return row.moveId;
}

export async function createBoxType(formData: FormData): Promise<void> {
  const parsed = createBoxTypeSchema.parse({
    moveId: formData.get("moveId"),
    label: formData.get("label"),
    volumeCuFt: formData.get("volumeCuFt") ?? "",
  });
  await requireMoveAccess(parsed.moveId, "editor");

  const db = getDb();
  try {
    await db.insert(boxTypes).values({
      id: generateId("boxtyp"),
      moveId: parsed.moveId,
      label: parsed.label,
      volumeCuFt: parsed.volumeCuFt != null ? parsed.volumeCuFt.toString() : null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("box_types_move_label_idx") || msg.includes("duplicate key")) {
      throw new Error(
        `A box type named "${parsed.label}" already exists. Pick a different name.`,
      );
    }
    throw err;
  }

  revalidatePath(`/${parsed.moveId}`, "layout");
}

export async function updateBoxType(formData: FormData): Promise<void> {
  const parsed = updateBoxTypeSchema.parse({
    boxTypeId: formData.get("boxTypeId"),
    label: formData.get("label"),
    volumeCuFt: formData.get("volumeCuFt") ?? "",
  });
  const moveId = await moveIdForBoxType(parsed.boxTypeId);
  await requireMoveAccess(moveId, "editor");

  const db = getDb();
  try {
    await db
      .update(boxTypes)
      .set({
        label: parsed.label,
        volumeCuFt:
          parsed.volumeCuFt != null ? parsed.volumeCuFt.toString() : null,
        updatedAt: new Date(),
      })
      .where(eq(boxTypes.id, parsed.boxTypeId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("box_types_move_label_idx") || msg.includes("duplicate key")) {
      throw new Error(
        `A box type named "${parsed.label}" already exists. Pick a different name.`,
      );
    }
    throw err;
  }

  revalidatePath(`/${moveId}`, "layout");
}

export async function deleteBoxType(formData: FormData): Promise<void> {
  const parsed = deleteBoxTypeSchema.parse({
    boxTypeId: formData.get("boxTypeId"),
  });
  const moveId = await moveIdForBoxType(parsed.boxTypeId);
  await requireMoveAccess(moveId, "editor");

  const db = getDb();

  const [inUse] = await db
    .select({ id: boxes.id })
    .from(boxes)
    .where(
      and(eq(boxes.boxTypeId, parsed.boxTypeId), isNull(boxes.deletedAt)),
    )
    .limit(1);

  if (inUse) {
    throw new Error(
      "Can't delete — there are still boxes using this type. Reassign or delete them first.",
    );
  }

  await db
    .update(boxTypes)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(boxTypes.id, parsed.boxTypeId));

  revalidatePath(`/${moveId}`, "layout");
}
