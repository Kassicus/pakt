import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { moves, rooms } from "@/db/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  const allRooms = await db
    .select({ id: rooms.id, label: rooms.label, kind: rooms.kind })
    .from(rooms)
    .where(eq(rooms.moveId, moveId))
    .orderBy(asc(rooms.sortOrder), asc(rooms.label));

  const originRooms = allRooms.filter((r) => r.kind === "origin");
  const destinationRooms = allRooms.filter((r) => r.kind === "destination");

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
        <CardContent>
          <CreateBoxForm
            moveId={moveId}
            originRooms={originRooms}
            destinationRooms={destinationRooms}
          />
        </CardContent>
      </Card>
    </div>
  );
}
