import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireMoveAccess } from "@/lib/auth/membership";
import { getDb } from "@/db";
import { boxes } from "@/db/schema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;
  const url = new URL(request.url);
  const moveId = url.searchParams.get("m");

  // Without an explicit moveId, we can't safely scope the lookup — the same
  // shortCode could exist in multiple moves the user is a member of.
  if (!moveId) {
    return new NextResponse(
      "Missing move id — open this scan from inside a specific move.",
      { status: 400 },
    );
  }

  await requireMoveAccess(moveId, "helper");

  const db = getDb();
  const rows = await db
    .select({
      id: boxes.id,
      moveId: boxes.moveId,
      status: boxes.status,
    })
    .from(boxes)
    .where(and(eq(boxes.shortCode, shortCode), eq(boxes.moveId, moveId)))
    .limit(1);

  if (rows.length === 0) {
    return new NextResponse(
      `No box found with code ${shortCode} in this move.`,
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
