import Link from "next/link";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { ChevronRight, PackageOpen } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { rooms, items, moves } from "@/db/schema";
import { AddRoomForm } from "@/components/app/AddRoomForm";
import { Card, CardContent } from "@/components/ui/card";

export default async function InventoryOverviewPage({
  params,
}: {
  params: Promise<{ moveId: string }>;
}) {
  const { moveId } = await params;
  const userId = await requireUserId();
  const db = getDb();

  const [ownMove] = await db
    .select({ id: moves.id })
    .from(moves)
    .where(and(eq(moves.id, moveId), eq(moves.ownerClerkUserId, userId)))
    .limit(1);
  if (!ownMove) return null;

  const originRooms = await db
    .select({
      id: rooms.id,
      label: rooms.label,
      sortOrder: rooms.sortOrder,
    })
    .from(rooms)
    .where(and(eq(rooms.moveId, moveId), eq(rooms.kind, "origin")))
    .orderBy(asc(rooms.sortOrder), asc(rooms.label));

  const countsRows = await db
    .select({ sourceRoomId: items.sourceRoomId, n: count() })
    .from(items)
    .where(and(eq(items.moveId, moveId), isNull(items.deletedAt)))
    .groupBy(items.sourceRoomId);

  const counts = new Map<string, number>();
  for (const r of countsRows) {
    if (r.sourceRoomId) counts.set(r.sourceRoomId, Number(r.n));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Inventory</h1>
        <p className="mt-1 text-muted-foreground">
          Walk room by room. Tap a room to add items.
        </p>
      </div>

      {originRooms.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No rooms yet. Add one below.
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {originRooms.map((room) => {
            const n = counts.get(room.id) ?? 0;
            return (
              <li key={room.id}>
                <Link
                  href={`/${moveId}/inventory/${room.id}`}
                  className="group flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/30"
                >
                  <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <PackageOpen className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{room.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {n === 0 ? "No items yet" : `${n} item${n === 1 ? "" : "s"}`}
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <AddRoomForm moveId={moveId} />
    </div>
  );
}
