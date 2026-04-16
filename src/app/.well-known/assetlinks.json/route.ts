// Android App Links verification manifest. Google's verifier fetches this
// over HTTPS to confirm the app+domain are linked.
//
// TODO before first Android release:
// 1. Generate a release signing keystore (see plan, step 11).
// 2. Get the SHA-256 fingerprint of the release key:
//      keytool -list -v -keystore <path-to-release-keystore.jks> -alias <alias>
// 3. Replace RELEASE_SHA256_TODO below with the colon-separated fingerprint.
// 4. Optionally also append the debug-key fingerprint for testing.

const PACKAGE_NAME = "app.pakt";

const assetlinks = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: PACKAGE_NAME,
      sha256_cert_fingerprints: ["RELEASE_SHA256_TODO"],
    },
  },
];

export async function GET() {
  return new Response(JSON.stringify(assetlinks), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
