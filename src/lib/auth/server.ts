import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";

let cached: NeonAuth | null = null;

function getAuth(): NeonAuth {
  if (cached) return cached;
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl) {
    throw new Error(
      "NEON_AUTH_BASE_URL is not set. Enable Neon Auth in your Neon project and run `vercel env pull .env.local`.",
    );
  }
  if (!cookieSecret || cookieSecret.length < 32) {
    throw new Error(
      "NEON_AUTH_COOKIE_SECRET is missing or too short (must be at least 32 characters).",
    );
  }
  cached = createNeonAuth({ baseUrl, cookies: { secret: cookieSecret } });
  return cached;
}

type NeonAuthSessionResult = Awaited<ReturnType<NeonAuth["getSession"]>>;

export const auth = {
  getSession: (): Promise<NeonAuthSessionResult> => getAuth().getSession(),
  handler: () => getAuth().handler(),
  middleware: (config?: Parameters<NeonAuth["middleware"]>[0]) =>
    getAuth().middleware(config),
};
