import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { boxes } from "@/db/schema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;
  const userId = await requireUserId();
  const url = new URL(request.url);
  const moveId = url.searchParams.get("m");

  const db = getDb();
  const rows = await db
    .select({
      id: boxes.id,
      moveId: boxes.moveId,
      status: boxes.status,
    })
    .from(boxes)
    .where(
      and(
        eq(boxes.shortCode, shortCode),
        eq(boxes.ownerClerkUserId, userId),
        ...(moveId ? [eq(boxes.moveId, moveId)] : []),
      ),
    )
    .limit(1);

  if (rows.length === 0) {
    return new NextResponse(
      `No box found with code ${shortCode}${moveId ? " in this move" : ""}.`,
      { status: 404 },
    );
  }

  const box = rows[0];
  const inTransitOrDone = ["delivered", "in_transit", "unpacked"].includes(box.status);
  const dest = inTransitOrDone
    ? `/${box.moveId}/unpack/${box.id}`
    : `/${box.moveId}/pack/${box.id}`;
  redirect(dest);
}
