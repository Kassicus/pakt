import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { itemCategories, itemPhotos, items, moves, rooms } from "@/db/schema";
import { AddItemForm, type CategoryOption } from "@/components/app/AddItemForm";
import { DispositionChips } from "@/components/app/DispositionChips";
import { DeleteItemButton } from "@/components/app/DeleteItemButton";
import { PhotoThumbnail } from "@/components/app/PhotoThumbnail";
import { Badge } from "@/components/ui/badge";
import type { Disposition } from "@/lib/validators";

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ moveId: string; roomId: string }>;
}) {
  const { moveId, roomId } = await params;
  const userId = await requireUserId();
  const db = getDb();

  const [room] = await db
    .select({
      id: rooms.id,
      label: rooms.label,
      moveId: rooms.moveId,
    })
    .from(rooms)
    .innerJoin(moves, eq(moves.id, rooms.moveId))
    .where(
      and(
        eq(rooms.id, roomId),
        eq(rooms.moveId, moveId),
        eq(moves.ownerClerkUserId, userId),
      ),
    )
    .limit(1);

  if (!room) notFound();

  const [categoryRows, itemRows] = await Promise.all([
    db
      .select({
        id: itemCategories.id,
        label: itemCategories.label,
        fragile: itemCategories.fragile,
        sortOrder: itemCategories.sortOrder,
      })
      .from(itemCategories)
      .orderBy(asc(itemCategories.sortOrder), asc(itemCategories.label)),
    db
      .select({
        id: items.id,
        name: items.name,
        quantity: items.quantity,
        disposition: items.disposition,
        notes: items.notes,
        categoryLabel: itemCategories.label,
      })
      .from(items)
      .leftJoin(itemCategories, eq(itemCategories.id, items.categoryId))
      .where(
        and(
          eq(items.moveId, moveId),
          eq(items.sourceRoomId, roomId),
          isNull(items.deletedAt),
        ),
      )
      .orderBy(desc(items.createdAt)),
  ]);

  const firstPhotoByItem = new Map<string, { url: string }>();
  if (itemRows.length > 0) {
    const photos = await db
      .select({
        itemId: itemPhotos.itemId,
        blobUrl: itemPhotos.blobUrl,
        createdAt: itemPhotos.createdAt,
      })
      .from(itemPhotos)
      .where(
        inArray(
          itemPhotos.itemId,
          itemRows.map((i) => i.id),
        ),
      )
      .orderBy(asc(itemPhotos.createdAt));
    for (const p of photos) {
      if (!firstPhotoByItem.has(p.itemId)) {
        firstPhotoByItem.set(p.itemId, { url: p.blobUrl });
      }
    }
  }

  const categories: CategoryOption[] = categoryRows.map((c) => ({
    id: c.id,
    label: c.label,
    fragile: c.fragile,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href={`/${moveId}/inventory`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> All rooms
          </Link>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{room.label}</h1>
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {itemRows.length} item{itemRows.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <AddItemForm moveId={moveId} sourceRoomId={roomId} categories={categories} />

      {itemRows.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          Add your first item above. Disposition chips will show up here.
        </div>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {itemRows.map((item) => {
            const photo = firstPhotoByItem.get(item.id);
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-3 p-4">
                {photo ? (
                  <PhotoThumbnail src={photo.url} alt={item.name} size={48} />
                ) : (
                  <div className="size-12 shrink-0 rounded-md border border-dashed bg-muted/40" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <Link
                      href={`/${moveId}/inventory/item/${item.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {item.name}
                    </Link>
                    {item.quantity > 1 && (
                      <div className="text-xs tabular-nums text-muted-foreground">
                        × {item.quantity}
                      </div>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {item.categoryLabel && <span>{item.categoryLabel}</span>}
                    {item.notes && <span className="truncate">— {item.notes}</span>}
                  </div>
                </div>
                <DispositionChips itemId={item.id} value={item.disposition as Disposition} />
                <DeleteItemButton itemId={item.id} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
