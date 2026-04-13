import { and, eq, isNull } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { boxes, rooms } from "@/db/schema";
import {
  labelFilename,
  renderLabelPngBuffer,
  type LabelBox,
} from "@/lib/labels";

type RouteContext = { params: Promise<{ boxId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { boxId } = await params;
  const userId = await requireUserId();

  const db = getDb();
  const [row] = await db
    .select({
      id: boxes.id,
      shortCode: boxes.shortCode,
      size: boxes.size,
      moveId: boxes.moveId,
      fragile: boxes.fragile,
      destinationRoomId: boxes.destinationRoomId,
      sourceRoomId: boxes.sourceRoomId,
    })
    .from(boxes)
    .where(
      and(
        eq(boxes.id, boxId),
        eq(boxes.ownerUserId, userId),
        isNull(boxes.deletedAt),
      ),
    )
    .limit(1);

  if (!row) return new Response("Not found", { status: 404 });

  const roomRows = await db
    .select({ id: rooms.id, label: rooms.label })
    .from(rooms)
    .where(eq(rooms.moveId, row.moveId));
  const labelById = new Map(roomRows.map((r) => [r.id, r.label] as const));

  const box: LabelBox = {
    shortCode: row.shortCode,
    size: row.size,
    moveId: row.moveId,
    fragile: row.fragile,
    destinationRoomLabel: row.destinationRoomId
      ? labelById.get(row.destinationRoomId) ?? null
      : null,
    sourceRoomLabel: row.sourceRoomId
      ? labelById.get(row.sourceRoomId) ?? null
      : null,
  };

  try {
    const buf = await renderLabelPngBuffer(box);
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${labelFilename(row.shortCode)}"`,
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(buf.length),
      },
    });
  } catch (err) {
    console.error("[labels] render failed", { boxId, err });
    return new Response("Label render failed", { status: 500 });
  }
}
