import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { requireMoveAccess } from "@/lib/auth/membership";
import { getDb } from "@/db";
import { boxTypes, boxes, moves } from "@/db/schema";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddBoxTypeForm } from "@/components/app/AddBoxTypeForm";
import { BoxTypeActionsMenu } from "@/components/app/BoxTypeActionsMenu";

export default async function BoxTypesPage({
  params,
}: {
  params: Promise<{ moveId: string }>;
}) {
  const { moveId } = await params;
  await requireMoveAccess(moveId, "editor");
  const db = getDb();

  const [move] = await db
    .select({ id: moves.id })
    .from(moves)
    .where(eq(moves.id, moveId))
    .limit(1);
  if (!move) notFound();

  const rows = await db
    .select({
      id: boxTypes.id,
      label: boxTypes.label,
      key: boxTypes.key,
      volumeCuFt: boxTypes.volumeCuFt,
      sortOrder: boxTypes.sortOrder,
      boxCount: sql<number>`
        (SELECT COUNT(*)::int FROM ${boxes}
         WHERE ${boxes.boxTypeId} = ${boxTypes.id}
           AND ${boxes.deletedAt} IS NULL)
      `.as("box_count"),
    })
    .from(boxTypes)
    .where(and(eq(boxTypes.moveId, moveId), isNull(boxTypes.deletedAt)))
    .orderBy(asc(boxTypes.sortOrder), asc(boxTypes.label));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${moveId}/dashboard`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Dashboard
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Box types</h1>
        <p className="mt-1 text-muted-foreground">
          Add, rename, or remove the box types you pick from when creating a box.
        </p>
      </div>

      <AddBoxTypeForm moveId={moveId} />

      <Card>
        <CardHeader>
          <CardTitle>Your types</CardTitle>
          <CardDescription>
            {rows.length === 0
              ? "No box types yet — add one above."
              : `${rows.length} type${rows.length === 1 ? "" : "s"}.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? null : (
            <ul className="divide-y rounded-lg border">
              {rows.map((t) => (
                <li key={t.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{t.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {t.volumeCuFt ? `${t.volumeCuFt} cuft` : "No volume set"}
                      {" · "}
                      {t.boxCount} box{t.boxCount === 1 ? "" : "es"} using this
                    </div>
                  </div>
                  <BoxTypeActionsMenu
                    boxTypeId={t.id}
                    label={t.label}
                    volumeCuFt={t.volumeCuFt}
                    boxCount={t.boxCount}
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
