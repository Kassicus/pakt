import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, isNull, notInArray } from "drizzle-orm";
import { ChevronLeft, Package } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import {
  boxItems,
  boxes,
  itemCategories,
  items,
  rooms,
} from "@/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BoxStatusBadge } from "@/components/app/BoxStatusBadge";
import { BoxStatusControls } from "@/components/app/BoxStatusControls";
import { RemoveBoxItemButton } from "@/components/app/RemoveBoxItemButton";
import {
  AddItemsToBoxPanel,
  type AvailableItem,
} from "@/components/app/AddItemsToBoxPanel";
import type { BoxStatus } from "@/lib/validators";

const SIZE_LABEL: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  dish_pack: "Dish pack",
  wardrobe: "Wardrobe",
  tote: "Tote",
};

export default async function PackBoxPage({
  params,
}: {
  params: Promise<{ moveId: string; boxId: string }>;
}) {
  const { moveId, boxId } = await params;
  const userId = await requireUserId();
  const db = getDb();

  const [box] = await db
    .select({
      id: boxes.id,
      shortCode: boxes.shortCode,
      size: boxes.size,
      status: boxes.status,
      fragile: boxes.fragile,
      sourceRoomId: boxes.sourceRoomId,
      destinationRoomId: boxes.destinationRoomId,
    })
    .from(boxes)
    .where(
      and(
        eq(boxes.id, boxId),
        eq(boxes.moveId, moveId),
        eq(boxes.ownerClerkUserId, userId),
        isNull(boxes.deletedAt),
      ),
    )
    .limit(1);

  if (!box) notFound();

  const [packedRows, unassignedRows, roomRows] = await Promise.all([
    db
      .select({
        id: items.id,
        name: items.name,
        quantity: items.quantity,
        categoryLabel: itemCategories.label,
      })
      .from(boxItems)
      .innerJoin(items, eq(items.id, boxItems.itemId))
      .leftJoin(itemCategories, eq(itemCategories.id, items.categoryId))
      .where(and(eq(boxItems.boxId, boxId), isNull(items.deletedAt)))
      .orderBy(desc(boxItems.createdAt)),
    db
      .select({
        id: items.id,
        name: items.name,
        quantity: items.quantity,
        categoryLabel: itemCategories.label,
        sourceRoomLabel: rooms.label,
        disposition: items.disposition,
      })
      .from(items)
      .leftJoin(itemCategories, eq(itemCategories.id, items.categoryId))
      .leftJoin(rooms, eq(rooms.id, items.sourceRoomId))
      .where(
        and(
          eq(items.moveId, moveId),
          isNull(items.deletedAt),
          notInArray(
            items.id,
            db.select({ itemId: boxItems.itemId }).from(boxItems),
          ),
        ),
      )
      .orderBy(asc(items.name)),
    db.select({ id: rooms.id, label: rooms.label }).from(rooms).where(eq(rooms.moveId, moveId)),
  ]);

  const roomLabelById = new Map(roomRows.map((r) => [r.id, r.label] as const));
  const destLabel = box.destinationRoomId
    ? roomLabelById.get(box.destinationRoomId)
    : null;

  const availableItems: AvailableItem[] = unassignedRows
    .filter(
      (i) =>
        i.disposition === "moving" ||
        i.disposition === "storage" ||
        i.disposition === "undecided",
    )
    .map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      categoryLabel: i.categoryLabel,
      sourceRoomLabel: i.sourceRoomLabel,
      disposition: i.disposition,
    }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${moveId}/pack`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Scan another
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Package className="size-6 text-muted-foreground" />
          <h1 className="font-mono text-3xl font-semibold tabular-nums">{box.shortCode}</h1>
          <BoxStatusBadge status={box.status as BoxStatus} />
          {box.fragile && (
            <Badge variant="outline" className="border-destructive/40 text-destructive">
              Fragile
            </Badge>
          )}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {SIZE_LABEL[box.size]}
          {destLabel && ` → ${destLabel}`}
        </div>
      </div>

      <BoxStatusControls boxId={box.id} status={box.status as BoxStatus} />

      <Card>
        <CardHeader>
          <CardTitle>Add items to this box</CardTitle>
          <CardDescription>
            Search your inventory. Tap + to drop into the box.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AddItemsToBoxPanel
            boxId={box.id}
            items={availableItems}
            preferredRoomId={box.sourceRoomId ?? null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Already in this box ({packedRows.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {packedRows.length === 0 ? (
            <div className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              Empty. Add items above to start filling it.
            </div>
          ) : (
            <ul className="divide-y rounded-lg border">
              {packedRows.map((item) => (
                <li key={item.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <div className="truncate font-medium">{item.name}</div>
                      {item.quantity > 1 && (
                        <div className="text-xs tabular-nums text-muted-foreground">
                          × {item.quantity}
                        </div>
                      )}
                    </div>
                    {item.categoryLabel && (
                      <div className="text-xs text-muted-foreground">{item.categoryLabel}</div>
                    )}
                  </div>
                  <RemoveBoxItemButton boxId={box.id} itemId={item.id} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
