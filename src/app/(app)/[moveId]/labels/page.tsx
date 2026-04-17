import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { requireMoveAccess } from "@/lib/auth/membership";
import { getDb } from "@/db";
import { boxTypes, boxes, moves, rooms } from "@/db/schema";
import { buildScanUrl, generateQrSvg } from "@/lib/qr";
import { qualifiedRoomLabel } from "@/lib/rooms";
import {
  LabelsDownloader,
  type LabelPreview,
} from "@/components/app/LabelsDownloader";

export default async function LabelsPage({
  params,
  searchParams,
}: {
  params: Promise<{ moveId: string }>;
  searchParams: Promise<{ selected?: string }>;
}) {
  const { moveId } = await params;
  const { selected } = await searchParams;
  await requireMoveAccess(moveId);
  const db = getDb();

  const [move] = await db
    .select({ id: moves.id, name: moves.name })
    .from(moves)
    .where(eq(moves.id, moveId))
    .limit(1);
  if (!move) notFound();

  const preselected = new Set(
    selected ? selected.split(",").filter(Boolean) : [],
  );

  const rows = await db
    .select({
      id: boxes.id,
      shortCode: boxes.shortCode,
      typeLabel: boxTypes.label,
      tags: boxes.tags,
      sourceRoomId: boxes.sourceRoomId,
      destinationRoomId: boxes.destinationRoomId,
    })
    .from(boxes)
    .leftJoin(boxTypes, eq(boxTypes.id, boxes.boxTypeId))
    .where(and(eq(boxes.moveId, moveId), isNull(boxes.deletedAt)))
    .orderBy(asc(boxes.shortCode));

  const roomRows = await db
    .select({
      id: rooms.id,
      label: rooms.label,
      parentRoomId: rooms.parentRoomId,
    })
    .from(rooms)
    .where(eq(rooms.moveId, moveId));

  const initialSelected = new Set(
    rows.filter((r) => preselected.has(r.id)).map((r) => r.id),
  );

  const labels: LabelPreview[] = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      shortCode: row.shortCode,
      typeLabel: row.typeLabel,
      tags: row.tags ?? [],
      sourceRoomLabel: row.sourceRoomId
        ? qualifiedRoomLabel(row.sourceRoomId, roomRows)
        : null,
      destinationRoomLabel: row.destinationRoomId
        ? qualifiedRoomLabel(row.destinationRoomId, roomRows)
        : null,
      qrSvg: await generateQrSvg(buildScanUrl(row.shortCode, moveId)),
    })),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${moveId}/dashboard`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Dashboard
        </Link>
        <div className="mt-2 space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Labels</h1>
          <p className="text-muted-foreground">
            {labels.length === 0
              ? "Create some boxes first, then come back to download labels."
              : `${labels.length} label${labels.length === 1 ? "" : "s"} sized for 40×30 mm sticky labels (472×354 px PNG).`}
          </p>
        </div>
      </div>

      <LabelsDownloader
        moveId={moveId}
        labels={labels}
        initialSelected={initialSelected}
      />

      {labels.length > 0 && (
        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          Import a single PNG (or the whole ZIP) into your label-maker software
          and print at actual size. The QR encodes the scan URL; short code +
          destination room print big for quick reading.
        </p>
      )}
    </div>
  );
}
