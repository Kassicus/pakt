import JSZip from "jszip";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { requireMoveAccess } from "@/lib/auth/membership";
import { getDb } from "@/db";
import { boxes, moves, rooms } from "@/db/schema";
import {
  labelFilename,
  renderLabelPngBuffer,
  type LabelBox,
} from "@/lib/labels";
import { qualifiedRoomLabel } from "@/lib/rooms";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "move";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const moveId = url.searchParams.get("m");
  const idsParam = url.searchParams.get("ids");
  if (!moveId) return new Response("Missing move id", { status: 400 });

  await requireMoveAccess(moveId, "helper");

  const ids = idsParam ? idsParam.split(",").filter(Boolean) : [];

  const db = getDb();

  const [move] = await db
    .select({ id: moves.id, name: moves.name })
    .from(moves)
    .where(eq(moves.id, moveId))
    .limit(1);
  if (!move) return new Response("Move not found", { status: 404 });

  const rows = await db
    .select({
      id: boxes.id,
      shortCode: boxes.shortCode,
      moveId: boxes.moveId,
      tags: boxes.tags,
      destinationRoomId: boxes.destinationRoomId,
      sourceRoomId: boxes.sourceRoomId,
    })
    .from(boxes)
    .where(
      and(
        eq(boxes.moveId, moveId),
        isNull(boxes.deletedAt),
        ...(ids.length > 0 ? [inArray(boxes.id, ids)] : []),
      ),
    );

  if (rows.length === 0) {
    return new Response("No boxes to export", { status: 404 });
  }

  const roomRows = await db
    .select({
      id: rooms.id,
      label: rooms.label,
      parentRoomId: rooms.parentRoomId,
    })
    .from(rooms)
    .where(eq(rooms.moveId, moveId));

  const zip = new JSZip();
  for (const row of rows) {
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
    const buf = await renderLabelPngBuffer(box);
    zip.file(labelFilename(row.shortCode), buf);
  }

  const body = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  const filename = `pakt-labels-${slugify(move.name)}.zip`;

  return new Response(body as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
