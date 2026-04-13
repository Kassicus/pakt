import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import { ChevronLeft, PackageOpen } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { boxItems, boxes, itemCategories, items, rooms } from "@/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BoxStatusBadge } from "@/components/app/BoxStatusBadge";
import { BoxStatusControls } from "@/components/app/BoxStatusControls";
import { MarkItemUnpackedButton } from "@/components/app/MarkItemUnpackedButton";
import type { BoxStatus } from "@/lib/validators";

const SIZE_LABEL: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  dish_pack: "Dish pack",
  wardrobe: "Wardrobe",
  tote: "Tote",
};

export default async function UnpackBoxPage({
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

  const [packedRows, roomRows] = await Promise.all([
    db
      .select({
        id: items.id,
        name: items.name,
        quantity: items.quantity,
        notes: items.notes,
        categoryLabel: itemCategories.label,
      })
      .from(boxItems)
      .innerJoin(items, eq(items.id, boxItems.itemId))
      .leftJoin(itemCategories, eq(itemCategories.id, items.categoryId))
      .where(and(eq(boxItems.boxId, boxId), isNull(items.deletedAt)))
      .orderBy(desc(boxItems.createdAt)),
    db.select({ id: rooms.id, label: rooms.label }).from(rooms).where(eq(rooms.moveId, moveId)),
  ]);

  const destLabel = box.destinationRoomId
    ? new Map(roomRows.map((r) => [r.id, r.label] as const)).get(box.destinationRoomId)
    : null;

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
          <PackageOpen className="size-6 text-muted-foreground" />
          <h1 className="font-mono text-3xl font-semibold tabular-nums">{box.shortCode}</h1>
          <BoxStatusBadge status={box.status as BoxStatus} />
          {box.fragile && (
            <Badge variant="outline" className="border-destructive/40 text-destructive">
              Fragile — handle with care
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
          <CardTitle>Inside this box</CardTitle>
          <CardDescription>
            {packedRows.length === 0
              ? "All unpacked! You can archive this box."
              : `${packedRows.length} item${packedRows.length === 1 ? "" : "s"} to place. Tap the check to mark each one as placed.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {packedRows.length === 0 ? (
            <div className="rounded-md border border-dashed py-10 text-center text-muted-foreground">
              Empty
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
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {item.categoryLabel && <span>{item.categoryLabel}</span>}
                      {item.notes && <span className="truncate">— {item.notes}</span>}
                    </div>
                  </div>
                  <MarkItemUnpackedButton
                    boxId={box.id}
                    itemId={item.id}
                    name={item.name}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
