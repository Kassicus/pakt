import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireMoveAccess } from "@/lib/auth/membership";

export async function POST(request: Request): Promise<Response> {
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

        const { userId } = await requireMoveAccess(moveId, "editor");

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
