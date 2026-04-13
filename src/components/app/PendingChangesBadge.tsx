"use client";

import { useEffect, useState } from "react";
import { CloudOff } from "lucide-react";
import { outboxEvents, outboxSize } from "@/lib/offline";

export function PendingChangesBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      const n = await outboxSize();
      if (!cancelled) setCount(n);
    }
    refresh();
    const onChange = () => {
      void refresh();
    };
    outboxEvents.addEventListener("change", onChange);
    return () => {
      cancelled = true;
      outboxEvents.removeEventListener("change", onChange);
    };
  }, []);

  if (count === 0) return null;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300"
      title={`${count} change${count === 1 ? "" : "s"} waiting to sync`}
    >
      <CloudOff className="size-3" />
      {count} pending
    </span>
  );
}
