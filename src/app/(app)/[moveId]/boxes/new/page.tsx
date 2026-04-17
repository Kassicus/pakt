import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { pickerRoomsFor } from "@/lib/rooms";
import { ChevronLeft } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { boxTypes, moves, rooms } from "@/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { CreateBoxForm } from "@/components/app/CreateBoxForm";

export default async function NewBoxPage({
  params,
}: {
  params: Promise<{ moveId: string }>;
}) {
  const { moveId } = await params;
  const userId = await requireUserId();
  const db = getDb();

  const [move] = await db
    .select({ id: moves.id })
    .from(moves)
    .where(and(eq(moves.id, moveId), eq(moves.ownerUserId, userId)))
    .limit(1);
  if (!move) notFound();

  const [allRooms, boxTypeRows] = await Promise.all([
    db
      .select({
        id: rooms.id,
        label: rooms.label,
        kind: rooms.kind,
        parentRoomId: rooms.parentRoomId,
      })
      .from(rooms)
      .where(eq(rooms.moveId, moveId)),
    db
      .select({
        id: boxTypes.id,
        label: boxTypes.label,
        volumeCuFt: boxTypes.volumeCuFt,
      })
      .from(boxTypes)
      .where(and(eq(boxTypes.moveId, moveId), isNull(boxTypes.deletedAt)))
      .orderBy(asc(boxTypes.sortOrder), asc(boxTypes.label)),
  ]);

  const originRooms = pickerRoomsFor("origin", allRooms);
  const destinationRooms = pickerRoomsFor("destination", allRooms);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href={`/${moveId}/boxes`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> All boxes
        </Link>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">New box</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>
            We&apos;ll auto-generate a short code like <span className="font-mono">B-A7K2</span> and print it on the label.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {boxTypeRows.length === 0 && (
            <div className="rounded-md border border-dashed p-3 text-sm">
              <p className="mb-2 text-muted-foreground">
                You don&apos;t have any box types yet. Create one first.
              </p>
              <Link
                href={`/${moveId}/box-types`}
                className={buttonVariants({ size: "sm" })}
              >
                Manage box types
              </Link>
            </div>
          )}
          <CreateBoxForm
            moveId={moveId}
            boxTypes={boxTypeRows}
            originRooms={originRooms}
            destinationRooms={destinationRooms}
          />
        </CardContent>
      </Card>
    </div>
  );
}
