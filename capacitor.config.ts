import type { CapacitorConfig } from "@capacitor/cli";

// `server.url` makes the native shell load the deployed Next.js app remotely.
// JS/UI updates ship via Vercel; only native-shell changes need a store submission.
//
// Set NEXT_PUBLIC_CAPACITOR_SERVER_URL in `.env.local` (e.g. https://pakt.app for
// production, or http://10.0.0.X:3000 with `cleartext: true` for local dev against
// `pnpm dev` on your LAN). The fallback below assumes a custom domain is already
// pointing at the Vercel deployment — substitute yours.
const serverUrl =
  process.env.NEXT_PUBLIC_CAPACITOR_SERVER_URL ?? "https://pakt.app";

const config: CapacitorConfig = {
  appId: "app.pakt",
  appName: "pakt",
  webDir: "public",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    androidScheme: "https",
  },
  ios: {
    contentInset: "always",
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
