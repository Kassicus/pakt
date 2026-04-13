import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Plus } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { boxes, rooms } from "@/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { BoxStatusBadge } from "@/components/app/BoxStatusBadge";
import type { BoxStatus } from "@/lib/validators";

const SIZE_LABEL: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  dish_pack: "Dish pack",
  wardrobe: "Wardrobe",
  tote: "Tote",
};

export default async function BoxesPage({
  params,
}: {
  params: Promise<{ moveId: string }>;
}) {
  const { moveId } = await params;
  const userId = await requireUserId();
  const db = getDb();

  const destRooms = Object.fromEntries(
    (
      await db
        .select({ id: rooms.id, label: rooms.label })
        .from(rooms)
        .where(eq(rooms.moveId, moveId))
    ).map((r) => [r.id, r.label]),
  );

  const rows = await db
    .select({
      id: boxes.id,
      shortCode: boxes.shortCode,
      size: boxes.size,
      status: boxes.status,
      fragile: boxes.fragile,
      destinationRoomId: boxes.destinationRoomId,
      sourceRoomId: boxes.sourceRoomId,
      createdAt: boxes.createdAt,
    })
    .from(boxes)
    .where(
      and(
        eq(boxes.moveId, moveId),
        eq(boxes.ownerClerkUserId, userId),
        isNull(boxes.deletedAt),
      ),
    )
    .orderBy(desc(boxes.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Boxes</h1>
          <p className="mt-1 text-muted-foreground">
            {rows.length === 0 ? "No boxes yet." : `${rows.length} boxes.`}
          </p>
        </div>
        <Link href={`/${moveId}/boxes/new`} className={buttonVariants()}>
          <Plus className="mr-2 size-4" /> New box
        </Link>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Create your first box</CardTitle>
            <CardDescription>
              Each box gets a unique short code and a printable QR label. Scan at the destination to see what&apos;s inside.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href={`/${moveId}/boxes/new`} className={buttonVariants()}>
              New box
            </Link>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rows.map((box) => (
            <li key={box.id}>
              <Link
                href={`/${moveId}/boxes/${box.id}`}
                className="flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent/30"
              >
                <div className="font-mono text-lg font-semibold tabular-nums">
                  {box.shortCode}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{SIZE_LABEL[box.size]}</span>
                    {box.fragile && (
                      <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                        Fragile
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {box.destinationRoomId
                      ? `→ ${destRooms[box.destinationRoomId] ?? "Unknown"}`
                      : "No destination set"}
                  </div>
                </div>
                <BoxStatusBadge status={box.status as BoxStatus} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
