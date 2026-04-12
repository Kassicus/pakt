import Link from "next/link";
import { and, eq, isNull } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { moves, items, boxes, rooms } from "@/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Box, Package, QrCode, Truck } from "lucide-react";

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
      .select({ id: items.id, disposition: items.disposition })
      .from(items)
      .where(and(eq(items.moveId, moveId), isNull(items.deletedAt))),
    db
      .select({ id: boxes.id })
      .from(boxes)
      .where(and(eq(boxes.moveId, moveId), isNull(boxes.deletedAt))),
    db.select({ id: rooms.id, kind: rooms.kind }).from(rooms).where(eq(rooms.moveId, moveId)),
  ]);

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
        <StatCard icon={Box} label="Moving" value={movingCount.toString()} />
        <StatCard icon={Truck} label="Undecided" value={undecidedCount.toString()} />
        <StatCard icon={QrCode} label="Boxes" value={boxRows.length.toString()} />
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
