import Link from "next/link";
import { and, asc, count, eq, isNull } from "drizzle-orm";
import { ChevronRight, CornerDownRight, MapPin, PackageOpen } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { rooms, items, moves } from "@/db/schema";
import { AddRoomForm, type ParentOption } from "@/components/app/AddRoomForm";
import { RoomActionsMenu } from "@/components/app/RoomActionsMenu";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Side = "origin" | "destination";

export default async function InventoryOverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ moveId: string }>;
  searchParams: Promise<{ side?: string }>;
}) {
  const { moveId } = await params;
  const { side: rawSide } = await searchParams;
  const side: Side = rawSide === "destination" ? "destination" : "origin";

  const userId = await requireUserId();
  const db = getDb();

  const [ownMove] = await db
    .select({ id: moves.id })
    .from(moves)
    .where(and(eq(moves.id, moveId), eq(moves.ownerUserId, userId)))
    .limit(1);
  if (!ownMove) return null;

  const roomsForSide = await db
    .select({
      id: rooms.id,
      label: rooms.label,
      parentRoomId: rooms.parentRoomId,
      sortOrder: rooms.sortOrder,
    })
    .from(rooms)
    .where(and(eq(rooms.moveId, moveId), eq(rooms.kind, side)))
    .orderBy(asc(rooms.sortOrder), asc(rooms.label));

  // Item counts per room, by side
  const counts = new Map<string, number>();
  if (side === "origin") {
    const rows = await db
      .select({ roomId: items.sourceRoomId, n: count() })
      .from(items)
      .where(and(eq(items.moveId, moveId), isNull(items.deletedAt)))
      .groupBy(items.sourceRoomId);
    for (const r of rows) if (r.roomId) counts.set(r.roomId, Number(r.n));
  } else {
    const rows = await db
      .select({ roomId: items.destinationRoomId, n: count() })
      .from(items)
      .where(and(eq(items.moveId, moveId), isNull(items.deletedAt)))
      .groupBy(items.destinationRoomId);
    for (const r of rows) if (r.roomId) counts.set(r.roomId, Number(r.n));
  }

  const existingIds = new Set(roomsForSide.map((r) => r.id));
  const topLevel = roomsForSide.filter(
    (r) => !r.parentRoomId || !existingIds.has(r.parentRoomId),
  );
  const childrenByParent = new Map<string, typeof roomsForSide>();
  for (const room of roomsForSide) {
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

  const isOrigin = side === "origin";
  const RoomIcon = isOrigin ? PackageOpen : MapPin;
  const emptyLabel = isOrigin
    ? "No items yet"
    : "Nothing routed here yet";
  const subtitle = isOrigin
    ? "Walk room by room. Tap a room to add items. Sub-spaces (closets, cabinets) can be added inside a room."
    : "Where your things are headed at the new place. Use these when creating boxes or editing items.";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Inventory</h1>
        <p className="mt-1 text-muted-foreground">{subtitle}</p>
      </div>

      <div className="inline-flex rounded-lg border bg-card p-0.5 text-sm">
        <Link
          href={`/${moveId}/inventory?side=origin`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
            isOrigin
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          scroll={false}
        >
          <PackageOpen className="size-4" /> Origin rooms
        </Link>
        <Link
          href={`/${moveId}/inventory?side=destination`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
            !isOrigin
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          scroll={false}
        >
          <MapPin className="size-4" /> Destination rooms
        </Link>
      </div>

      {roomsForSide.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No {isOrigin ? "origin" : "destination"} rooms yet. Add one below.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {topLevel.map((room) => {
            const children = childrenByParent.get(room.id) ?? [];
            const n = counts.get(room.id) ?? 0;
            return (
              <li key={room.id} className="space-y-1">
                <RoomRow
                  moveId={moveId}
                  side={side}
                  room={room}
                  count={n}
                  emptyLabel={emptyLabel}
                  Icon={RoomIcon}
                />
                {children.length > 0 && (
                  <ul className="ml-6 space-y-1 border-l pl-4">
                    {children.map((child) => {
                      const childCount = counts.get(child.id) ?? 0;
                      return (
                        <li key={child.id}>
                          <RoomRow
                            moveId={moveId}
                            side={side}
                            room={child}
                            count={childCount}
                            emptyLabel={emptyLabel}
                            nested
                          />
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

      <AddRoomForm
        moveId={moveId}
        kind={side}
        parentOptions={parentOptions}
      />
    </div>
  );
}

function RoomRow({
  moveId,
  side,
  room,
  count,
  emptyLabel,
  Icon,
  nested,
}: {
  moveId: string;
  side: Side;
  room: { id: string; label: string };
  count: number;
  emptyLabel: string;
  Icon?: React.ComponentType<{ className?: string }>;
  nested?: boolean;
}) {
  const isLinkable = side === "origin";
  const RowIcon = Icon ?? PackageOpen;

  const content = (
    <>
      {nested ? (
        <CornerDownRight className="size-4 text-muted-foreground" />
      ) : (
        <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <RowIcon className="size-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className={cn("truncate", nested ? "text-sm" : "font-medium")}>
          {room.label}
        </div>
        <div className="text-xs text-muted-foreground">
          {count === 0 ? emptyLabel : `${count} item${count === 1 ? "" : "s"}`}
        </div>
      </div>
      {isLinkable ? (
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      ) : null}
    </>
  );

  return (
    <div
      className={cn(
        "group flex items-stretch gap-1 transition-colors",
        nested
          ? "rounded-md border bg-card/60 hover:bg-accent/30"
          : "rounded-lg border bg-card hover:bg-accent/30",
      )}
    >
      {isLinkable ? (
        <Link
          href={`/${moveId}/inventory/${room.id}`}
          className={cn(
            "flex flex-1 items-center gap-3",
            nested ? "px-3 py-2.5 text-sm" : "p-4",
          )}
        >
          {content}
        </Link>
      ) : (
        <div
          className={cn(
            "flex flex-1 items-center gap-3",
            nested ? "px-3 py-2.5 text-sm" : "p-4",
          )}
        >
          {content}
        </div>
      )}
      <div className={cn("flex items-center", nested ? "pr-1.5" : "pr-2")}>
        <RoomActionsMenu
          roomId={room.id}
          roomLabel={room.label}
          itemCount={count}
        />
      </div>
    </div>
  );
}
