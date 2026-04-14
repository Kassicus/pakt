import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/moves(.*)",
  "/:moveId/dashboard(.*)",
  "/:moveId/inventory(.*)",
  "/:moveId/triage(.*)",
  "/:moveId/decide(.*)",
  "/:moveId/boxes(.*)",
  "/:moveId/pack(.*)",
  "/:moveId/unpack(.*)",
  "/:moveId/labels(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Run on every route except Next.js internals and static assets,
    // so `auth()` is always available in pages and server actions.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
