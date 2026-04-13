import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { and, eq } from "drizzle-orm";
import { requireUserId } from "@/lib/auth";
import { getDb } from "@/db";
import { moves } from "@/db/schema";

export async function POST(request: Request): Promise<Response> {
  const userId = await requireUserId();
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        let moveId: string | undefined;
        try {
          moveId = clientPayload ? (JSON.parse(clientPayload).moveId as string) : undefined;
        } catch {
          throw new Error("Invalid clientPayload");
        }
        if (!moveId) throw new Error("moveId is required");

        const db = getDb();
        const [row] = await db
          .select({ id: moves.id })
          .from(moves)
          .where(and(eq(moves.id, moveId), eq(moves.ownerClerkUserId, userId)))
          .limit(1);
        if (!row) throw new Error("Move not found for this user");

        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          tokenPayload: JSON.stringify({ userId, moveId }),
          addRandomSuffix: false,
          cacheControlMaxAge: 31536000,
          maximumSizeInBytes: 10 * 1024 * 1024,
        };
      },
      onUploadCompleted: async () => {
        // no-op; client follows up with `attachPhoto` server action
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload token error" },
      { status: 400 },
    );
  }
}
