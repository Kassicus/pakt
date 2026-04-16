"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";

/**
 * On native, listens for Universal Links (iOS) / App Links (Android) tapped
 * from outside the app (Messages, Mail, browser) and routes them to the
 * matching in-app path.
 *
 * No-op on web; Next.js handles browser navigation natively.
 */
export function DeepLinkRouter() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let appListener: { remove: () => void } | null = null;

    (async () => {
      try {
        const { App } = await import("@capacitor/app");

        appListener = await App.addListener("appUrlOpen", (event) => {
          // event.url looks like "https://pakt.app/invites/abc..." — strip the
          // origin so router.replace gets a path-only string.
          try {
            const url = new URL(event.url);
            const path = `${url.pathname}${url.search}${url.hash}`;
            if (path) router.replace(path);
          } catch {
            // not a parseable URL; ignore
          }
        });
      } catch (err) {
        console.error("[deeplink] App listener init failed", err);
      }
    })();

    return () => {
      appListener?.remove();
    };
  }, [router]);

  return null;
}
