import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { requireMoveAccess } from "@/lib/auth/membership";
import { getDb } from "@/db";
import { itemCategories, itemPhotos, items, rooms } from "@/db/schema";
import { pickerRoomsFor } from "@/lib/rooms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DispositionChips } from "@/components/app/DispositionChips";
import {
  EditItemForm,
  type CategoryOption,
  type EditItemInitial,
  type RoomOption,
} from "@/components/app/EditItemForm";
import { ItemPhotoManager, type ExistingPhoto } from "@/components/app/ItemPhotoManager";
import { DeleteItemWithUndo } from "@/components/app/DeleteItemWithUndo";
import type { Disposition } from "@/lib/validators";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ moveId: string; itemId: string }>;
}) {
  const { moveId, itemId } = await params;
  await requireMoveAccess(moveId);
  const db = getDb();

  const [item] = await db
    .select({
      id: items.id,
      name: items.name,
      categoryId: items.categoryId,
      quantity: items.quantity,
      fragility: items.fragility,
      disposition: items.disposition,
      sourceRoomId: items.sourceRoomId,
      destinationRoomId: items.destinationRoomId,
      notes: items.notes,
      volumeOverride: items.volumeCuFtOverride,
      weightOverride: items.weightLbsOverride,
    })
    .from(items)
    .where(
      and(
        eq(items.id, itemId),
        eq(items.moveId, moveId),
        isNull(items.deletedAt),
      ),
    )
    .limit(1);

  if (!item) notFound();

  const [categoryRows, roomRows, photoRows] = await Promise.all([
    db
      .select({
        id: itemCategories.id,
        label: itemCategories.label,
        volumeCuFt: itemCategories.volumeCuFtPerItem,
        weightLbs: itemCategories.weightLbsPerItem,
      })
      .from(itemCategories)
      .orderBy(asc(itemCategories.sortOrder), asc(itemCategories.label)),
    db
      .select({
        id: rooms.id,
        label: rooms.label,
        kind: rooms.kind,
        parentRoomId: rooms.parentRoomId,
      })
      .from(rooms)
      .where(eq(rooms.moveId, moveId)),
    db
      .select({ id: itemPhotos.id, url: itemPhotos.blobUrl })
      .from(itemPhotos)
      .where(eq(itemPhotos.itemId, itemId))
      .orderBy(asc(itemPhotos.createdAt)),
  ]);

  const categories: CategoryOption[] = categoryRows.map((c) => ({
    id: c.id,
    label: c.label,
    volumeCuFt: c.volumeCuFt !== null ? Number(c.volumeCuFt) : null,
    weightLbs: c.weightLbs !== null ? Number(c.weightLbs) : null,
  }));
  const originRooms: RoomOption[] = pickerRoomsFor("origin", roomRows);
  const destinationRooms: RoomOption[] = pickerRoomsFor("destination", roomRows);
  const photos: ExistingPhoto[] = photoRows.map(({ id, url }) => ({ id, url }));

  const initial: EditItemInitial = {
    itemId: item.id,
    name: item.name,
    categoryId: item.categoryId ?? categoryRows[0]?.id ?? "",
    quantity: item.quantity,
    fragility: item.fragility as EditItemInitial["fragility"],
    sourceRoomId: item.sourceRoomId,
    destinationRoomId: item.destinationRoomId,
    notes: item.notes,
    volumeCuFtOverride:
      item.volumeOverride !== null ? String(item.volumeOverride) : null,
    weightLbsOverride:
      item.weightOverride !== null ? String(item.weightOverride) : null,
  };

  const backToRoomId =
    item.sourceRoomId ?? (originRooms[0]?.id ?? null);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={
            backToRoomId
              ? `/${moveId}/inventory/${backToRoomId}`
              : `/${moveId}/inventory`
          }
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Back
        </Link>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{item.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemPhotoManager itemId={item.id} moveId={moveId} photos={photos} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Disposition</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DispositionChips itemId={item.id} value={item.disposition as Disposition} />
          <Link
            href={`/${moveId}/decide/${item.id}`}
            className="inline-block text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Not sure? Run the keep/donate quiz →
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <EditItemForm
            initial={initial}
            categories={categories}
            originRooms={originRooms}
            destinationRooms={destinationRooms}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <DeleteItemWithUndo
          itemId={item.id}
          moveId={moveId}
          backToRoomId={backToRoomId}
        />
      </div>
    </div>
  );
}
