import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { ChevronLeft, MapPin } from "lucide-react";
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
      kind: rooms.kind,
      parentRoomId: rooms.parentRoomId,
      moveId: rooms.moveId,
    })
    .from(rooms)
    .innerJoin(moves, eq(moves.id, rooms.moveId))
    .where(
      and(
        eq(rooms.id, roomId),
        eq(rooms.moveId, moveId),
        eq(moves.ownerUserId, userId),
      ),
    )
    .limit(1);

  if (!room) notFound();

  const isOrigin = room.kind === "origin";
  const backHref = `/${moveId}/inventory?side=${room.kind}`;

  // Optional: parent room name for breadcrumb
  let parentLabel: string | null = null;
  if (room.parentRoomId) {
    const [parent] = await db
      .select({ label: rooms.label })
      .from(rooms)
      .where(eq(rooms.id, room.parentRoomId))
      .limit(1);
    parentLabel = parent?.label ?? null;
  }

  // Fetch items — filter by source OR destination based on room kind
  const itemRows = isOrigin
    ? await db
        .select({
          id: items.id,
          name: items.name,
          quantity: items.quantity,
          disposition: items.disposition,
          notes: items.notes,
          categoryLabel: itemCategories.label,
          sourceRoomLabel: rooms.label,
        })
        .from(items)
        .leftJoin(itemCategories, eq(itemCategories.id, items.categoryId))
        .leftJoin(rooms, eq(rooms.id, items.sourceRoomId))
        .where(
          and(
            eq(items.moveId, moveId),
            eq(items.sourceRoomId, roomId),
            isNull(items.deletedAt),
          ),
        )
        .orderBy(desc(items.createdAt))
    : await db
        .select({
          id: items.id,
          name: items.name,
          quantity: items.quantity,
          disposition: items.disposition,
          notes: items.notes,
          categoryLabel: itemCategories.label,
          sourceRoomLabel: rooms.label,
        })
        .from(items)
        .leftJoin(itemCategories, eq(itemCategories.id, items.categoryId))
        .leftJoin(rooms, eq(rooms.id, items.sourceRoomId))
        .where(
          and(
            eq(items.moveId, moveId),
            eq(items.destinationRoomId, roomId),
            isNull(items.deletedAt),
          ),
        )
        .orderBy(desc(items.createdAt));

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

  // Categories — only needed for the origin add-item form
  const categoryRows = isOrigin
    ? await db
        .select({
          id: itemCategories.id,
          label: itemCategories.label,
          fragile: itemCategories.fragile,
          sortOrder: itemCategories.sortOrder,
        })
        .from(itemCategories)
        .orderBy(asc(itemCategories.sortOrder), asc(itemCategories.label))
    : [];

  const categories: CategoryOption[] = categoryRows.map((c) => ({
    id: c.id,
    label: c.label,
    fragile: c.fragile,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" /> All {isOrigin ? "origin" : "destination"} rooms
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-semibold tracking-tight">
            {!isOrigin && <MapPin className="size-6 text-muted-foreground" />}
            <span className="truncate">{room.label}</span>
          </h1>
          {parentLabel && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              inside {parentLabel}
            </p>
          )}
        </div>
        <Badge variant="secondary" className="tabular-nums">
          {itemRows.length} item{itemRows.length === 1 ? "" : "s"}
        </Badge>
      </div>

      {isOrigin && (
        <AddItemForm moveId={moveId} sourceRoomId={roomId} categories={categories} />
      )}

      {itemRows.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          {isOrigin
            ? "Add your first item above. Disposition chips will show up here."
            : "Nothing is routed here yet. Items gain this destination when you edit them or assign them to a box heading here."}
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
                    {!isOrigin && item.sourceRoomLabel && (
                      <>
                        <span>·</span>
                        <span>from {item.sourceRoomLabel}</span>
                      </>
                    )}
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
