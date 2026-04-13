import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { boxes } from "@/db/schema";
import { buildScanUrl, generateQrSvg } from "@/lib/qr";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;
  const userId = await requireUserId();
  const url = new URL(request.url);
  const moveId = url.searchParams.get("m");
  if (!moveId) return new NextResponse("Missing move id", { status: 400 });

  const db = getDb();
  const [box] = await db
    .select({ id: boxes.id })
    .from(boxes)
    .where(
      and(
        eq(boxes.shortCode, shortCode),
        eq(boxes.moveId, moveId),
        eq(boxes.ownerUserId, userId),
      ),
    )
    .limit(1);
  if (!box) return new NextResponse("Not found", { status: 404 });

  const svg = await generateQrSvg(buildScanUrl(shortCode, moveId));
  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
