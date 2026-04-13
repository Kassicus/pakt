import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";
import {
  AlertTriangle,
  Box as BoxIcon,
  Package,
  QrCode,
  Truck as TruckIcon,
} from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { moves, items, boxes, rooms, itemCategories } from "@/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BOX_VOLUME_CUFT,
  predictBoxCounts,
  recommendTruck,
  type PredictionItem,
} from "@/lib/predictions";

const BOX_LABEL: Record<keyof typeof BOX_VOLUME_CUFT, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  dish_pack: "Dish pack",
  wardrobe: "Wardrobe",
  tote: "Tote",
};

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ moveId: string }>;
}) {
  const { moveId } = await params;
  const userId = await requireUserId();
  const db = getDb();

  const [move] = await db
    .select()
    .from(moves)
    .where(and(eq(moves.id, moveId), eq(moves.ownerClerkUserId, userId)))
    .limit(1);

  if (!move) return null;

  const [itemRows, boxRows, roomRows] = await Promise.all([
    db
      .select({
        id: items.id,
        categoryId: items.categoryId,
        quantity: items.quantity,
        disposition: items.disposition,
        volumeOverride: items.volumeCuFtOverride,
        weightOverride: items.weightLbsOverride,
        catVolume: itemCategories.volumeCuFtPerItem,
        catWeight: itemCategories.weightLbsPerItem,
        catBoxType: itemCategories.recommendedBoxType,
      })
      .from(items)
      .leftJoin(itemCategories, eq(itemCategories.id, items.categoryId))
      .where(and(eq(items.moveId, moveId), isNull(items.deletedAt))),
    db
      .select({ id: boxes.id })
      .from(boxes)
      .where(and(eq(boxes.moveId, moveId), isNull(boxes.deletedAt))),
    db.select({ id: rooms.id, kind: rooms.kind }).from(rooms).where(eq(rooms.moveId, moveId)),
  ]);

  const predictionItems: PredictionItem[] = itemRows.map((r) => ({
    categoryId: r.categoryId,
    quantity: r.quantity,
    volumeCuFt: Number(r.volumeOverride ?? r.catVolume ?? 0),
    weightLbs: Number(r.weightOverride ?? r.catWeight ?? 0),
    recommendedBoxType: (r.catBoxType ?? "medium") as PredictionItem["recommendedBoxType"],
    disposition: r.disposition as PredictionItem["disposition"],
  }));

  const boxPrediction = predictBoxCounts(predictionItems);
  const truck = recommendTruck(predictionItems);

  const totalItems = itemRows.length;
  const movingCount = itemRows.filter((i) => i.disposition === "moving").length;
  const undecidedCount = itemRows.filter((i) => i.disposition === "undecided").length;
  const originRooms = roomRows.filter((r) => r.kind === "origin").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{move.name}</h1>
        <p className="mt-1 text-muted-foreground">
          {move.plannedMoveDate
            ? `Planned for ${new Date(move.plannedMoveDate).toLocaleDateString()}`
            : "No move date set yet"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard icon={Package} label="Items" value={totalItems.toString()} />
        <StatCard icon={BoxIcon} label="Moving" value={movingCount.toString()} />
        <StatCard icon={TruckIcon} label="Undecided" value={undecidedCount.toString()} />
        <StatCard icon={QrCode} label="Boxes planned" value={boxRows.length.toString()} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BoxIcon className="size-4" /> Predicted boxes
            </CardTitle>
            <CardDescription>
              {boxPrediction.totalBoxCount === 0
                ? "Add items and pakt will estimate boxes for you."
                : `~${boxPrediction.totalBoxCount} boxes for items marked moving or storage`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {boxPrediction.totalBoxCount === 0 ? (
              <div className="text-sm text-muted-foreground">No predictions yet.</div>
            ) : (
              <ul className="divide-y">
                {(
                  Object.keys(boxPrediction.boxesByType) as Array<
                    keyof typeof boxPrediction.boxesByType
                  >
                )
                  .filter((k) => boxPrediction.boxesByType[k] > 0)
                  .map((k) => (
                    <li key={k} className="flex items-center justify-between py-2 text-sm">
                      <span>{BOX_LABEL[k]}</span>
                      <span className="tabular-nums font-medium">
                        {boxPrediction.boxesByType[k]}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TruckIcon className="size-4" /> Recommended truck
            </CardTitle>
            <CardDescription>
              {totalItems === 0
                ? "Inventory your items to get a truck recommendation."
                : truck.note}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {totalItems > 0 && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Size</span>
                  <span className="font-semibold uppercase tabular-nums">
                    {truck.size === "oversized" ? "Too much" : truck.size}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Estimated volume</span>
                  <span className="tabular-nums">
                    {truck.totalVolumeCuFt.toFixed(0)} cuft
                  </span>
                </div>
                {truck.cuft && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Truck capacity</span>
                    <span className="tabular-nums">{truck.cuft} cuft</span>
                  </div>
                )}
                {truck.heavyItemCount > 0 && (
                  <div className="flex items-start gap-2 rounded-md bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <div className="text-xs">
                      {truck.heavyItemCount} heavy item
                      {truck.heavyItemCount === 1 ? "" : "s"} (&gt;150 lb). Grab a dolly
                      or an extra helper.
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Get started</CardTitle>
          <CardDescription>
            {originRooms > 0
              ? `${originRooms} origin rooms ready. Start inventorying.`
              : "Add some rooms, then inventory items room by room."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href={`/${moveId}/inventory`} className={buttonVariants()}>
            Inventory
          </Link>
          <Link href={`/${moveId}/boxes`} className={buttonVariants({ variant: "secondary" })}>
            Boxes
          </Link>
          <Link href={`/${moveId}/pack`} className={buttonVariants({ variant: "secondary" })}>
            Pack mode
          </Link>
          <Link href={`/${moveId}/labels`} className={buttonVariants({ variant: "ghost" })}>
            Print labels
          </Link>
        </CardContent>
      </Card>

      <Badge variant="outline" className="font-mono text-xs">
        {moveId}
      </Badge>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <Icon className="size-5 text-muted-foreground" />
        <div>
          <div className="text-sm text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
