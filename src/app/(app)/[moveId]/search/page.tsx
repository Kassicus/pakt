import Link from "next/link";
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { Box as BoxIcon, Package, PackageOpen, Search as SearchIcon } from "lucide-react";
import { requireMoveAccess } from "@/lib/auth/membership";
import { getDb } from "@/db";
import {
  boxItems,
  boxes,
  itemCategories,
  itemPhotos,
  items,
  rooms,
} from "@/db/schema";
import { SearchForm } from "@/components/app/SearchForm";
import { DispositionChips } from "@/components/app/DispositionChips";
import { PhotoThumbnail } from "@/components/app/PhotoThumbnail";
import { Badge } from "@/components/ui/badge";
import type { Disposition } from "@/lib/validators";

const MAX_RESULTS = 60;

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ moveId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { moveId } = await params;
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim();

  await requireMoveAccess(moveId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Search</h1>
        <p className="mt-1 text-muted-foreground">
          Find items by name, category, notes, or room.
        </p>
      </div>

      <SearchForm moveId={moveId} initialQuery={q} />

      {q.length === 0 ? (
        <EmptyHint />
      ) : (
        <SearchResults moveId={moveId} query={q} />
      )}
    </div>
  );
}

function EmptyHint() {
  return (
    <div className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
      <SearchIcon className="mx-auto mb-2 size-6 opacity-40" />
      Start typing — we&apos;ll look across every item in this move.
    </div>
  );
}

async function SearchResults({
  moveId,
  query,
}: {
  moveId: string;
  query: string;
}) {
  const db = getDb();
  const srcRoom = alias(rooms, "src_room");
  const dstRoom = alias(rooms, "dst_room");

  const like = `%${query.replace(/[%_]/g, (c) => `\\${c}`)}%`;

  const rows = await db
    .select({
      id: items.id,
      name: items.name,
      quantity: items.quantity,
      disposition: items.disposition,
      fragility: items.fragility,
      notes: items.notes,
      categoryLabel: itemCategories.label,
      sourceRoomId: srcRoom.id,
      sourceRoomLabel: srcRoom.label,
      destRoomId: dstRoom.id,
      destRoomLabel: dstRoom.label,
    })
    .from(items)
    .leftJoin(itemCategories, eq(itemCategories.id, items.categoryId))
    .leftJoin(srcRoom, eq(srcRoom.id, items.sourceRoomId))
    .leftJoin(dstRoom, eq(dstRoom.id, items.destinationRoomId))
    .where(
      and(
        eq(items.moveId, moveId),
        isNull(items.deletedAt),
        or(
          ilike(items.name, like),
          ilike(items.notes, like),
          ilike(itemCategories.label, like),
          ilike(srcRoom.label, like),
          ilike(dstRoom.label, like),
        ),
      ),
    )
    .orderBy(
      // Promote exact/prefix matches on name
      sql`CASE
        WHEN lower(${items.name}) = lower(${query}) THEN 0
        WHEN lower(${items.name}) LIKE lower(${query + "%"}) THEN 1
        ELSE 2
      END`,
      desc(items.createdAt),
    )
    .limit(MAX_RESULTS);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
        Nothing matches <span className="font-medium text-foreground">“{query}”</span>.
      </div>
    );
  }

  // First photo per item
  const photoByItem = new Map<string, string>();
  const photos = await db
    .select({
      itemId: itemPhotos.itemId,
      url: itemPhotos.blobUrl,
      createdAt: itemPhotos.createdAt,
    })
    .from(itemPhotos)
    .where(
      inArray(
        itemPhotos.itemId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(asc(itemPhotos.createdAt));
  for (const p of photos) {
    if (!photoByItem.has(p.itemId)) photoByItem.set(p.itemId, p.url);
  }

  // Current box for each item (first box it's in — typically only one)
  const boxByItem = new Map<
    string,
    { id: string; shortCode: string; status: string; destLabel: string | null }
  >();
  const boxRows = await db
    .select({
      itemId: boxItems.itemId,
      boxId: boxes.id,
      shortCode: boxes.shortCode,
      status: boxes.status,
      destRoomId: boxes.destinationRoomId,
    })
    .from(boxItems)
    .innerJoin(boxes, eq(boxes.id, boxItems.boxId))
    .where(
      and(
        inArray(
          boxItems.itemId,
          rows.map((r) => r.id),
        ),
        isNull(boxes.deletedAt),
      ),
    )
    .orderBy(asc(boxItems.createdAt));

  if (boxRows.length > 0) {
    const destRoomIds = Array.from(
      new Set(boxRows.map((b) => b.destRoomId).filter((v): v is string => !!v)),
    );
    const destLabels = new Map<string, string>();
    if (destRoomIds.length > 0) {
      const destLabelRows = await db
        .select({ id: rooms.id, label: rooms.label })
        .from(rooms)
        .where(inArray(rooms.id, destRoomIds));
      for (const r of destLabelRows) destLabels.set(r.id, r.label);
    }

    for (const b of boxRows) {
      if (!boxByItem.has(b.itemId)) {
        boxByItem.set(b.itemId, {
          id: b.boxId,
          shortCode: b.shortCode,
          status: b.status,
          destLabel: b.destRoomId ? destLabels.get(b.destRoomId) ?? null : null,
        });
      }
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {rows.length} result{rows.length === 1 ? "" : "s"}
          {rows.length === MAX_RESULTS ? " (showing the first 60)" : ""}
        </span>
      </div>
      <ul className="divide-y rounded-lg border bg-card">
        {rows.map((item) => {
          const photo = photoByItem.get(item.id);
          const box = boxByItem.get(item.id);
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-3 p-4"
            >
              {photo ? (
                <PhotoThumbnail src={photo} alt={item.name} size={56} />
              ) : (
                <div className="flex size-14 shrink-0 items-center justify-center rounded-md border border-dashed bg-muted/40 text-muted-foreground">
                  <Package className="size-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <Link
                    href={`/${moveId}/inventory/item/${item.id}`}
                    className="truncate font-medium hover:underline"
                  >
                    {item.name}
                  </Link>
                  {item.quantity > 1 && (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      × {item.quantity}
                    </span>
                  )}
                  {item.fragility !== "normal" && (
                    <Badge
                      variant="outline"
                      className="border-destructive/40 text-[10px] uppercase tracking-wider text-destructive"
                    >
                      Fragile
                    </Badge>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                  {item.categoryLabel && <span>{item.categoryLabel}</span>}
                  {item.sourceRoomLabel && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <PackageOpen className="size-3" />
                        {item.sourceRoomLabel}
                      </span>
                    </>
                  )}
                  {item.destRoomLabel && !box && (
                    <>
                      <span>·</span>
                      <span>→ {item.destRoomLabel}</span>
                    </>
                  )}
                </div>
                {box && (
                  <Link
                    href={`/${moveId}/boxes/${box.id}`}
                    className="mt-1 inline-flex flex-wrap items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <BoxIcon className="size-3.5" />
                    <span className="font-mono">{box.shortCode}</span>
                    {box.destLabel && <span>→ {box.destLabel}</span>}
                    <span className="text-muted-foreground">· {box.status}</span>
                  </Link>
                )}
                {item.notes && (
                  <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {item.notes}
                  </div>
                )}
              </div>
              <DispositionChips
                itemId={item.id}
                value={item.disposition as Disposition}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
