import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull, inArray } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { boxes, moves, rooms } from "@/db/schema";
import { buildScanUrl, generateQrSvg } from "@/lib/qr";
import { PrintButton } from "@/components/app/PrintButton";

const SIZE_LABEL: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  dish_pack: "Dish pack",
  wardrobe: "Wardrobe",
  tote: "Tote",
};

export default async function LabelsPage({
  params,
  searchParams,
}: {
  params: Promise<{ moveId: string }>;
  searchParams: Promise<{ focus?: string }>;
}) {
  const { moveId } = await params;
  const { focus } = await searchParams;
  const userId = await requireUserId();
  const db = getDb();

  const [move] = await db
    .select({ id: moves.id, name: moves.name })
    .from(moves)
    .where(and(eq(moves.id, moveId), eq(moves.ownerUserId, userId)))
    .limit(1);
  if (!move) notFound();

  const focusIds = focus ? focus.split(",").filter(Boolean) : [];

  const rows = await db
    .select({
      id: boxes.id,
      shortCode: boxes.shortCode,
      size: boxes.size,
      fragile: boxes.fragile,
      sourceRoomId: boxes.sourceRoomId,
      destinationRoomId: boxes.destinationRoomId,
    })
    .from(boxes)
    .where(
      and(
        eq(boxes.moveId, moveId),
        eq(boxes.ownerUserId, userId),
        isNull(boxes.deletedAt),
        ...(focusIds.length > 0 ? [inArray(boxes.id, focusIds)] : []),
      ),
    )
    .orderBy(asc(boxes.shortCode));

  const roomRows = await db
    .select({ id: rooms.id, label: rooms.label })
    .from(rooms)
    .where(eq(rooms.moveId, moveId));
  const roomLabel = new Map(roomRows.map((r) => [r.id, r.label] as const));

  const labels = await Promise.all(
    rows.map(async (box) => ({
      ...box,
      sourceLabel: box.sourceRoomId ? roomLabel.get(box.sourceRoomId) ?? null : null,
      destLabel: box.destinationRoomId
        ? roomLabel.get(box.destinationRoomId) ?? null
        : null,
      qrSvg: await generateQrSvg(buildScanUrl(box.shortCode, moveId)),
    })),
  );

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Link
          href={`/${moveId}/dashboard`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" /> Dashboard
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Labels</h1>
            <p className="mt-1 text-muted-foreground">
              {labels.length === 0
                ? "No boxes to print yet."
                : `${labels.length} label${labels.length === 1 ? "" : "s"}. Print on US Letter, cut, and tape to your boxes.`}
            </p>
          </div>
          {labels.length > 0 && <PrintButton />}
        </div>
      </div>

      {labels.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground print:hidden">
          Create some boxes first, then come back here to print.
        </div>
      ) : (
        <div className="label-sheet">
          {labels.map((label) => (
            <div key={label.id} className="label-card">
              <div className="label-qr" dangerouslySetInnerHTML={{ __html: label.qrSvg }} />
              <div className="label-meta">
                <div className="label-code">{label.shortCode}</div>
                <div className="label-size">{SIZE_LABEL[label.size]}</div>
                {label.destLabel && (
                  <div className="label-dest">→ {label.destLabel}</div>
                )}
                {label.sourceLabel && (
                  <div className="label-source">from {label.sourceLabel}</div>
                )}
                {label.fragile && <div className="label-fragile">FRAGILE</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
