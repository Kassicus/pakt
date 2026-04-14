"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { requireMoveAccess } from "@/lib/auth/membership";
import { getDb } from "@/db";
import { moves, rooms, checklistItems, moveMembers } from "@/db/schema";
import { generateId } from "@/lib/shortcode";
import { createMoveSchema, DEFAULT_ROOMS } from "@/lib/validators";
import { DEFAULT_CHECKLIST } from "@/lib/checklist-defaults";

export async function createMove(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const parsed = createMoveSchema.safeParse({
    name: formData.get("name"),
    originAddress: formData.get("originAddress") ?? "",
    destinationAddress: formData.get("destinationAddress") ?? "",
    plannedMoveDate: formData.get("plannedMoveDate") ?? "",
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const db = getDb();
  const moveId = generateId("mov");
  await db.insert(moves).values({
    id: moveId,
    ownerUserId: userId,
    name: parsed.data.name,
    originAddress: parsed.data.originAddress || null,
    destinationAddress: parsed.data.destinationAddress || null,
    plannedMoveDate: parsed.data.plannedMoveDate || null,
  });

  await db.insert(moveMembers).values({
    id: generateId("mmb"),
    moveId,
    userId,
    role: "owner",
    addedByUserId: userId,
  });

  const seeds = DEFAULT_ROOMS.flatMap((room, idx) =>
    room.sides.map((kind) => ({
      id: generateId("rm"),
      moveId,
      kind,
      label: room.label,
      sortOrder: idx * 10,
    })),
  );
  await db.insert(rooms).values(seeds);

  const checklistSeeds = DEFAULT_CHECKLIST.map((task, idx) => ({
    id: generateId("chk"),
    moveId,
    text: task.text,
    category: task.category,
    sortOrder: idx * 10,
  }));
  await db.insert(checklistItems).values(checklistSeeds);

  revalidatePath("/moves");
  redirect(`/${moveId}/dashboard`);
}

export async function deleteMove(moveId: string) {
  await requireMoveAccess(moveId, "owner");
  const db = getDb();
  await db.delete(moves).where(eq(moves.id, moveId));
  revalidatePath("/moves");
}
