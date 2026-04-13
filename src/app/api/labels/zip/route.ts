import JSZip from "jszip";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { boxes, moves, rooms } from "@/db/schema";
import {
  labelFilename,
  renderLabelPngBuffer,
  type LabelBox,
} from "@/lib/labels";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "move";
}

export async function GET(request: Request) {
  const userId = await requireUserId();
  const url = new URL(request.url);
  const moveId = url.searchParams.get("m");
  const idsParam = url.searchParams.get("ids");
  if (!moveId) return new Response("Missing move id", { status: 400 });

  const ids = idsParam ? idsParam.split(",").filter(Boolean) : [];

  const db = getDb();

  const [move] = await db
    .select({ id: moves.id, name: moves.name })
    .from(moves)
    .where(and(eq(moves.id, moveId), eq(moves.ownerUserId, userId)))
    .limit(1);
  if (!move) return new Response("Move not found", { status: 404 });

  const rows = await db
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
        eq(boxes.moveId, moveId),
        eq(boxes.ownerUserId, userId),
        isNull(boxes.deletedAt),
        ...(ids.length > 0 ? [inArray(boxes.id, ids)] : []),
      ),
    );

  if (rows.length === 0) {
    return new Response("No boxes to export", { status: 404 });
  }

  const roomRows = await db
    .select({ id: rooms.id, label: rooms.label })
    .from(rooms)
    .where(eq(rooms.moveId, moveId));
  const labelById = new Map(roomRows.map((r) => [r.id, r.label] as const));

  const zip = new JSZip();
  for (const row of rows) {
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
