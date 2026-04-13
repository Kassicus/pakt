"use client";

import { useTransition } from "react";
import { CheckCircle2, Archive, Heart, Trash2, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { updateDisposition } from "@/actions/items";
import { toast } from "sonner";
import type { Disposition } from "@/lib/validators";

type Option = {
  value: Disposition;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClass: string;
};

const OPTIONS: Option[] = [
  {
    value: "undecided",
    label: "?",
    icon: HelpCircle,
    activeClass: "bg-muted text-foreground border-border",
  },
  {
    value: "moving",
    label: "Move",
    icon: CheckCircle2,
    activeClass: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  },
  {
    value: "storage",
    label: "Store",
    icon: Archive,
    activeClass: "bg-sky-500/15 text-sky-600 border-sky-500/30 dark:text-sky-400",
  },
  {
    value: "donate",
    label: "Donate",
    icon: Heart,
    activeClass: "bg-violet-500/15 text-violet-600 border-violet-500/30 dark:text-violet-400",
  },
  {
    value: "trash",
    label: "Trash",
    icon: Trash2,
    activeClass: "bg-destructive/10 text-destructive border-destructive/30",
  },
];

export function DispositionChips({
  itemId,
  value,
}: {
  itemId: string;
  value: Disposition;
}) {
  const [isPending, startTransition] = useTransition();

  function onSelect(next: Disposition) {
    if (next === value || isPending) return;
    const fd = new FormData();
    fd.set("itemId", itemId);
    fd.set("disposition", next);
    startTransition(async () => {
      try {
        await updateDisposition(fd);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Update failed");
      }
    });
  }

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5",
        isPending && "pointer-events-none opacity-60",
      )}
      role="radiogroup"
      aria-label="Disposition"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(opt.value)}
            className={cn(
              "inline-flex h-7 items-center gap-1 rounded-full border px-2 text-xs font-medium transition-colors",
              active
                ? opt.activeClass
                : "border-border bg-transparent text-muted-foreground hover:bg-muted",
            )}
          >
            <Icon className="size-3.5" />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
