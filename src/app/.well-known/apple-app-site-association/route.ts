// Apple Universal Links manifest. Apple's CDN fetches this over HTTPS and
// caches it. Must be served as `application/json` (the file has no extension
// per Apple's spec, but the response Content-Type is what matters).
//
// TODO before first iOS build: replace TEAM_ID with your 10-char Apple Team
// ID (Apple Developer → Membership → Team ID) and confirm appID matches the
// Bundle ID set in Xcode (defaults to app.pakt from capacitor.config.ts).
//
// Paths intentionally limited to the routes we want to deep-link from
// outside the app: invitation accept, QR scan, dashboard shortcuts.

const TEAM_ID = "TEAM_ID_TODO";
const BUNDLE_ID = "app.pakt";

const aasa = {
  applinks: {
    apps: [],
    details: [
      {
        appID: `${TEAM_ID}.${BUNDLE_ID}`,
        paths: ["/invites/*", "/s/*", "/*/dashboard"],
      },
    ],
  },
};

export async function GET() {
  return new Response(JSON.stringify(aasa), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
