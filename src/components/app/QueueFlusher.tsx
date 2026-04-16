"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { flushOutbox } from "@/lib/offline";

export function QueueFlusher() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    let resumeListener: { remove: () => void } | null = null;

    async function tryFlush() {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      const result = await flushOutbox();
      if (cancelled) return;
      if (result.flushed > 0) {
        toast.success(
          `Synced ${result.flushed} pending change${result.flushed === 1 ? "" : "s"}`,
        );
        router.refresh();
      }
      if (result.failed > 0) {
        toast.error(
          `${result.failed} change${result.failed === 1 ? "" : "s"} couldn't sync after retries`,
        );
      }
    }

    void tryFlush();

    function onOnline() {
      void tryFlush();
    }
    function onVisible() {
      if (document.visibilityState === "visible") void tryFlush();
    }

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);

    // On native, the visibility/online events don't fire reliably when the
    // app is backgrounded for long stretches. Hook into Capacitor's resume
    // event so the outbox flushes the moment the user returns.
    if (Capacitor.isNativePlatform()) {
      (async () => {
        try {
          const { App } = await import("@capacitor/app");
          resumeListener = await App.addListener("resume", () => {
            void tryFlush();
          });
        } catch (err) {
          console.error("[outbox] resume listener init failed", err);
        }
      })();
    }

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      resumeListener?.remove();
    };
  }, [router]);

  return null;
}
