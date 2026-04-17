import { and, eq, isNull } from "drizzle-orm";
import { requireMoveAccess } from "@/lib/auth/membership";
import { getDb } from "@/db";
import { boxes, rooms } from "@/db/schema";
import {
  labelFilename,
  renderLabelPngBuffer,
  type LabelBox,
} from "@/lib/labels";
import { qualifiedRoomLabel } from "@/lib/rooms";

type RouteContext = { params: Promise<{ boxId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { boxId } = await params;

  const db = getDb();
  const [row] = await db
    .select({
      id: boxes.id,
      shortCode: boxes.shortCode,
      moveId: boxes.moveId,
      tags: boxes.tags,
      destinationRoomId: boxes.destinationRoomId,
      sourceRoomId: boxes.sourceRoomId,
    })
    .from(boxes)
    .where(and(eq(boxes.id, boxId), isNull(boxes.deletedAt)))
    .limit(1);

  if (!row) return new Response("Not found", { status: 404 });

  try {
    await requireMoveAccess(row.moveId);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const roomRows = await db
    .select({
      id: rooms.id,
      label: rooms.label,
      parentRoomId: rooms.parentRoomId,
    })
    .from(rooms)
    .where(eq(rooms.moveId, row.moveId));

  const box: LabelBox = {
    shortCode: row.shortCode,
    moveId: row.moveId,
    tags: row.tags ?? [],
    destinationRoomLabel: row.destinationRoomId
      ? qualifiedRoomLabel(row.destinationRoomId, roomRows)
      : null,
    sourceRoomLabel: row.sourceRoomId
      ? qualifiedRoomLabel(row.sourceRoomId, roomRows)
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
