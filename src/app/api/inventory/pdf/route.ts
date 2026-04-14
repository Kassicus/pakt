import { NextResponse } from "next/server";
import { and, asc, eq, isNull } from "drizzle-orm";
import { requireMoveAccess } from "@/lib/auth/membership";
import { getDb } from "@/db";
import {
  boxItems,
  boxes,
  itemCategories,
  items,
  moves,
  rooms,
} from "@/db/schema";
import {
  predictBoxCounts,
  recommendTruck,
  type PredictionItem,
} from "@/lib/predictions";
import {
  inventoryFilename,
  renderInventoryPdfBuffer,
} from "@/lib/pdf/InventoryDocument";
import type {
  DispositionTotals,
  InventoryPdfData,
  InventoryPdfItem,
  InventoryRoomGroup,
} from "@/lib/pdf/types";
import type { Disposition } from "@/lib/validators";

export async function GET(req: Request) {
  try {
    return await handleGet(req);
  } catch (err) {
    console.error("[inventory pdf]", err);
    return NextResponse.json({ error: "render failed" }, { status: 500 });
  }
}

async function handleGet(req: Request) {
  const url = new URL(req.url);
  const moveId = url.searchParams.get("m");
  if (!moveId) {
    return NextResponse.json({ error: "missing move id" }, { status: 400 });
  }

  await requireMoveAccess(moveId, "helper");
  const db = getDb();

  const [move] = await db
    .select({
      id: moves.id,
      name: moves.name,
      plannedMoveDate: moves.plannedMoveDate,
      originAddress: moves.originAddress,
      destinationAddress: moves.destinationAddress,
    })
    .from(moves)
    .where(eq(moves.id, moveId))
    .limit(1);

  if (!move) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const itemRows = await db
    .select({
      id: items.id,
      name: items.name,
      quantity: items.quantity,
      fragility: items.fragility,
      disposition: items.disposition,
      notes: items.notes,
      categoryId: items.categoryId,
      categoryLabel: itemCategories.label,
      categoryVolume: itemCategories.volumeCuFtPerItem,
      categoryWeight: itemCategories.weightLbsPerItem,
      categoryBoxType: itemCategories.recommendedBoxType,
      volumeOverride: items.volumeCuFtOverride,
      weightOverride: items.weightLbsOverride,
      sourceRoomId: items.sourceRoomId,
      sourceRoomLabel: rooms.label,
      sourceRoomSort: rooms.sortOrder,
      destinationRoomId: items.destinationRoomId,
    })
    .from(items)
    .leftJoin(itemCategories, eq(itemCategories.id, items.categoryId))
    .leftJoin(rooms, eq(rooms.id, items.sourceRoomId))
    .where(and(eq(items.moveId, moveId), isNull(items.deletedAt)))
    .orderBy(asc(rooms.sortOrder), asc(items.name));

  const destRoomIds = Array.from(
    new Set(itemRows.map((r) => r.destinationRoomId).filter((v): v is string => !!v)),
  );
  const destLabels = new Map<string, string>();
  if (destRoomIds.length > 0) {
    const destRows = await db
      .select({ id: rooms.id, label: rooms.label })
      .from(rooms)
      .where(eq(rooms.moveId, moveId));
    for (const r of destRows) destLabels.set(r.id, r.label);
  }

  const itemIds = itemRows.map((r) => r.id);
  const boxByItem = new Map<string, string>();
  if (itemIds.length > 0) {
    const boxRows = await db
      .select({
        itemId: boxItems.itemId,
        shortCode: boxes.shortCode,
      })
      .from(boxItems)
      .innerJoin(boxes, eq(boxes.id, boxItems.boxId))
      .where(and(eq(boxes.moveId, moveId), isNull(boxes.deletedAt)));
    for (const b of boxRows) {
      if (!boxByItem.has(b.itemId)) boxByItem.set(b.itemId, b.shortCode);
    }
  }

  const predictionItems: PredictionItem[] = itemRows.map((r) => ({
    categoryId: r.categoryId,
    quantity: r.quantity,
    volumeCuFt: Number(r.volumeOverride ?? r.categoryVolume ?? 0),
    weightLbs: Number(r.weightOverride ?? r.categoryWeight ?? 0),
    recommendedBoxType: (r.categoryBoxType ?? "medium") as PredictionItem["recommendedBoxType"],
    disposition: r.disposition as Disposition,
  }));

  const prediction = predictBoxCounts(predictionItems);
  const truck = recommendTruck(predictionItems);

  const byDisposition: DispositionTotals = {
    undecided: 0,
    moving: 0,
    storage: 0,
    donate: 0,
    trash: 0,
    sold: 0,
  };
  let totalQuantity = 0;
  for (const r of itemRows) {
    byDisposition[r.disposition as Disposition] += 1;
    totalQuantity += r.quantity;
  }

  const groupMap = new Map<string, InventoryRoomGroup>();
  const unassignedKey = "__unassigned__";
  for (const r of itemRows) {
    const key = r.sourceRoomId ?? unassignedKey;
    let group = groupMap.get(key);
    if (!group) {
      group = {
        roomId: r.sourceRoomId,
        roomLabel: r.sourceRoomLabel ?? "Unassigned",
        items: [],
      };
      groupMap.set(key, group);
    }
    const pdfItem: InventoryPdfItem = {
      id: r.id,
      name: r.name,
      quantity: r.quantity,
      fragility: r.fragility as InventoryPdfItem["fragility"],
      disposition: r.disposition as Disposition,
      categoryLabel: r.categoryLabel,
      destinationLabel: r.destinationRoomId
        ? destLabels.get(r.destinationRoomId) ?? null
        : null,
      boxShortCode: boxByItem.get(r.id) ?? null,
      notes: r.notes,
    };
    group.items.push(pdfItem);
  }

  const groups: InventoryRoomGroup[] = Array.from(groupMap.values()).sort((a, b) => {
    if (a.roomId === null) return 1;
    if (b.roomId === null) return -1;
    return 0;
  });

  const generatedAt = new Date();
  const data: InventoryPdfData = {
    move,
    generatedAt,
    totals: { items: itemRows.length, quantity: totalQuantity, byDisposition },
    prediction,
    truck,
    groups,
  };

  const buffer = await renderInventoryPdfBuffer(data);
  const filename = inventoryFilename(move.name, generatedAt);

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "Content-Length": String(buffer.byteLength),
    },
  });
}
