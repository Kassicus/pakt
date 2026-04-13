"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { flushOutbox } from "@/lib/offline";

export function QueueFlusher() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

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
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}
