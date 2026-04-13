import Link from "next/link";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { ChevronRight, CornerDownRight, PackageOpen } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { rooms, items, moves } from "@/db/schema";
import { AddRoomForm, type ParentOption } from "@/components/app/AddRoomForm";
import { RoomActionsMenu } from "@/components/app/RoomActionsMenu";
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
    .where(and(eq(moves.id, moveId), eq(moves.ownerUserId, userId)))
    .limit(1);
  if (!ownMove) return null;

  const originRooms = await db
    .select({
      id: rooms.id,
      label: rooms.label,
      parentRoomId: rooms.parentRoomId,
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

  const existingIds = new Set(originRooms.map((r) => r.id));
  const topLevel = originRooms.filter(
    (r) => !r.parentRoomId || !existingIds.has(r.parentRoomId),
  );
  const childrenByParent = new Map<string, typeof originRooms>();
  for (const room of originRooms) {
    if (room.parentRoomId && existingIds.has(room.parentRoomId)) {
      const bucket = childrenByParent.get(room.parentRoomId) ?? [];
      bucket.push(room);
      childrenByParent.set(room.parentRoomId, bucket);
    }
  }

  const parentOptions: ParentOption[] = topLevel.map((r) => ({
    id: r.id,
    label: r.label,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Inventory</h1>
        <p className="mt-1 text-muted-foreground">
          Walk room by room. Tap a room to add items. Closets, cabinets, and
          other sub-spaces can be added inside a room.
        </p>
      </div>

      {originRooms.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No rooms yet. Add one below.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {topLevel.map((room) => {
            const children = childrenByParent.get(room.id) ?? [];
            const n = counts.get(room.id) ?? 0;
            return (
              <li key={room.id} className="space-y-1">
                <div className="group flex items-stretch gap-1 rounded-lg border bg-card transition-colors hover:bg-accent/30">
                  <Link
                    href={`/${moveId}/inventory/${room.id}`}
                    className="flex flex-1 items-center gap-3 p-4"
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
                  <div className="flex items-center pr-2">
                    <RoomActionsMenu
                      roomId={room.id}
                      roomLabel={room.label}
                      itemCount={n}
                    />
                  </div>
                </div>
                {children.length > 0 && (
                  <ul className="ml-6 space-y-1 border-l pl-4">
                    {children.map((child) => {
                      const childCount = counts.get(child.id) ?? 0;
                      return (
                        <li key={child.id}>
                          <div className="group flex items-stretch gap-1 rounded-md border bg-card/60 transition-colors hover:bg-accent/30">
                            <Link
                              href={`/${moveId}/inventory/${child.id}`}
                              className="flex flex-1 items-center gap-2.5 px-3 py-2.5 text-sm"
                            >
                              <CornerDownRight className="size-4 text-muted-foreground" />
                              <div className="flex-1 min-w-0">
                                <div className="truncate">{child.label}</div>
                                <div className="text-xs text-muted-foreground">
                                  {childCount === 0
                                    ? "No items yet"
                                    : `${childCount} item${childCount === 1 ? "" : "s"}`}
                                </div>
                              </div>
                              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                            </Link>
                            <div className="flex items-center pr-1.5">
                              <RoomActionsMenu
                                roomId={child.id}
                                roomLabel={child.label}
                                itemCount={childCount}
                              />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <AddRoomForm moveId={moveId} parentOptions={parentOptions} />
    </div>
  );
}
