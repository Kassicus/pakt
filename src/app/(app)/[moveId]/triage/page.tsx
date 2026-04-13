import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { itemCategories, itemPhotos, items, rooms } from "@/db/schema";
import { TriageDeck } from "@/components/app/TriageDeck";
import type { TriageItem } from "@/components/app/TriageCard";

export default async function TriagePage({
  params,
}: {
  params: Promise<{ moveId: string }>;
}) {
  const { moveId } = await params;
  const userId = await requireUserId();
  const db = getDb();

  const rawItems = await db
    .select({
      id: items.id,
      name: items.name,
      quantity: items.quantity,
      categoryId: items.categoryId,
      categoryLabel: itemCategories.label,
      sourceRoomLabel: rooms.label,
      fragility: items.fragility,
      notes: items.notes,
    })
    .from(items)
    .leftJoin(itemCategories, eq(itemCategories.id, items.categoryId))
    .leftJoin(rooms, eq(rooms.id, items.sourceRoomId))
    .where(
      and(
        eq(items.moveId, moveId),
        eq(items.ownerUserId, userId),
        eq(items.disposition, "undecided"),
        isNull(items.deletedAt),
      ),
    )
    .orderBy(desc(items.createdAt));

  const photoByItem = new Map<string, string>();
  if (rawItems.length > 0) {
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
          rawItems.map((i) => i.id),
        ),
      )
      .orderBy(asc(itemPhotos.createdAt));
    for (const p of photos) {
      if (!photoByItem.has(p.itemId)) photoByItem.set(p.itemId, p.blobUrl);
    }
  }

  const triageItems: TriageItem[] = rawItems.map((i) => ({
    id: i.id,
    name: i.name,
    quantity: i.quantity,
    categoryId: i.categoryId,
    categoryLabel: i.categoryLabel,
    sourceRoomLabel: i.sourceRoomLabel,
    fragility: i.fragility as TriageItem["fragility"],
    notes: i.notes,
    photoUrl: photoByItem.get(i.id) ?? null,
  }));

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Triage</h1>
        <p className="mt-1 text-muted-foreground">
          Decide where each item goes. Use <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-xs">M</kbd>{" "}
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-xs">S</kbd>{" "}
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-xs">D</kbd>{" "}
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-xs">T</kbd> or tap.
        </p>
      </div>
      <TriageDeck items={triageItems} moveId={moveId} />
    </div>
  );
}
