import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/server";

const neonMiddleware = auth.middleware({ loginUrl: "/auth/sign-in" });

export default function proxy(request: NextRequest) {
  // Skip auth middleware for Server Action POSTs — they authenticate themselves
  // inside the action and middleware redirects break the RSC response protocol.
  if (request.headers.get("next-action")) {
    return NextResponse.next();
  }
  return neonMiddleware(request);
}

export const config = {
  matcher: [
    "/moves",
    "/moves/:path*",
    "/:moveId/dashboard/:path*",
    "/:moveId/inventory/:path*",
    "/:moveId/triage/:path*",
    "/:moveId/decide/:path*",
    "/:moveId/boxes/:path*",
    "/:moveId/pack/:path*",
    "/:moveId/unpack/:path*",
    "/:moveId/labels/:path*",
  ],
};
