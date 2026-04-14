"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { del } from "@vercel/blob";
import { requireMoveAccess } from "@/lib/auth/membership";
import { getDb } from "@/db";
import { itemPhotos, items } from "@/db/schema";
import { generateId } from "@/lib/shortcode";
import { attachPhotoSchema, deletePhotoSchema } from "@/lib/validators";

async function itemContext(itemId: string) {
  const db = getDb();
  const [row] = await db
    .select({ id: items.id, moveId: items.moveId, sourceRoomId: items.sourceRoomId })
    .from(items)
    .where(eq(items.id, itemId))
    .limit(1);
  if (!row) throw new Error("Item not found");
  return row;
}

export async function attachPhoto(input: {
  itemId: string;
  blobPathname: string;
  url: string;
  width?: number;
  height?: number;
  byteSize?: number;
  contentType?: string;
}): Promise<{ photoId: string }> {
  const parsed = attachPhotoSchema.parse(input);
  const { moveId, sourceRoomId } = await itemContext(parsed.itemId);
  await requireMoveAccess(moveId, "editor");

  const db = getDb();
  const photoId = generateId("ph");
  await db.insert(itemPhotos).values({
    id: photoId,
    itemId: parsed.itemId,
    blobPathname: parsed.blobPathname,
    blobUrl: parsed.url,
    width: parsed.width ?? null,
    height: parsed.height ?? null,
    byteSize: parsed.byteSize ?? null,
    contentType: parsed.contentType ?? null,
  });

  if (sourceRoomId) revalidatePath(`/${moveId}/inventory/${sourceRoomId}`);
  revalidatePath(`/${moveId}/inventory/item/${parsed.itemId}`);

  return { photoId };
}

export async function deletePhoto(photoId: string): Promise<void> {
  const parsed = deletePhotoSchema.parse({ photoId });

  const db = getDb();
  const [photo] = await db
    .select({
      id: itemPhotos.id,
      itemId: itemPhotos.itemId,
      blobPathname: itemPhotos.blobPathname,
      moveId: items.moveId,
      sourceRoomId: items.sourceRoomId,
    })
    .from(itemPhotos)
    .innerJoin(items, eq(items.id, itemPhotos.itemId))
    .where(eq(itemPhotos.id, parsed.photoId))
    .limit(1);

  if (!photo) throw new Error("Photo not found");
  await requireMoveAccess(photo.moveId, "editor");

  await db.delete(itemPhotos).where(eq(itemPhotos.id, parsed.photoId));

  try {
    await del(photo.blobPathname);
  } catch {
    // Blob may already be gone; DB is the source of truth.
  }

  if (photo.sourceRoomId) {
    revalidatePath(`/${photo.moveId}/inventory/${photo.sourceRoomId}`);
  }
  revalidatePath(`/${photo.moveId}/inventory/item/${photo.itemId}`);
}
