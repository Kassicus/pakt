"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

export function SwRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // In a Capacitor native shell, the OS handles caching/lifecycle. SW is
    // unnecessary and on iOS WKWebView is often broken — skip it entirely.
    if (Capacitor.isNativePlatform()) return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {
          // silent; SW failures shouldn't surface to users
        });
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}
