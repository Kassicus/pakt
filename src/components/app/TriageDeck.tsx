"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  Clock,
  Heart,
  HelpCircle,
  PartyPopper,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { updateDisposition } from "@/actions/items";
import { TriageCard, type TriageItem } from "./TriageCard";
import type { Disposition } from "@/lib/validators";

type Action = {
  label: string;
  hint: string;
  value: Disposition;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
};

const ACTIONS: Action[] = [
  {
    label: "Move",
    hint: "M",
    value: "moving",
    icon: CheckCircle2,
    className:
      "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400",
  },
  {
    label: "Store",
    hint: "S",
    value: "storage",
    icon: Archive,
    className: "bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 dark:text-sky-400",
  },
  {
    label: "Donate",
    hint: "D",
    value: "donate",
    icon: Heart,
    className:
      "bg-violet-500/10 text-violet-600 hover:bg-violet-500/20 dark:text-violet-400",
  },
  {
    label: "Trash",
    hint: "T",
    value: "trash",
    icon: Trash2,
    className: "bg-destructive/10 text-destructive hover:bg-destructive/20",
  },
];

export function TriageDeck({
  items,
  moveId,
}: {
  items: TriageItem[];
  moveId: string;
}) {
  const [index, setIndex] = useState(0);
  const [decided, setDecided] = useState(0);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const current = items[index];
  const total = items.length;
  const progressPct = useMemo(
    () => (total === 0 ? 100 : Math.round((decided / total) * 100)),
    [decided, total],
  );

  const advance = useCallback(() => {
    setIndex((i) => Math.min(i + 1, items.length));
  }, [items.length]);

  const decide = useCallback(
    (value: Disposition) => {
      if (!current || isPending) return;
      const fd = new FormData();
      fd.set("itemId", current.id);
      fd.set("disposition", value);
      startTransition(async () => {
        try {
          await updateDisposition(fd);
          setDecided((n) => n + 1);
          advance();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Update failed");
        }
      });
    },
    [current, isPending, advance],
  );

  const skip = useCallback(() => {
    advance();
  }, [advance]);

  useEffect(() => {
    function isTypingTarget(el: Element | null): boolean {
      if (!el) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (el as HTMLElement).isContentEditable
      );
    }
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(document.activeElement)) return;
      const key = e.key.toLowerCase();
      if (key === "m") {
        e.preventDefault();
        decide("moving");
      } else if (key === "s") {
        e.preventDefault();
        decide("storage");
      } else if (key === "d") {
        e.preventDefault();
        decide("donate");
      } else if (key === "t") {
        e.preventDefault();
        decide("trash");
      } else if (key === "l") {
        e.preventDefault();
        skip();
      } else if (key === "/" || key === "?") {
        if (current) {
          e.preventDefault();
          router.push(`/${moveId}/decide/${current.id}`);
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [decide, skip, router, moveId, current]);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-12 text-center">
        <PartyPopper className="size-10 text-emerald-500" />
        <h2 className="text-2xl font-semibold">Everything decided</h2>
        <p className="text-muted-foreground">
          No undecided items left. Head back to the dashboard or add more items.
        </p>
        <Link href={`/${moveId}/dashboard`} className={`mt-2 ${buttonVariants()}`}>
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-12 text-center">
        <PartyPopper className="size-10 text-emerald-500" />
        <h2 className="text-2xl font-semibold">All done for now</h2>
        <p className="text-muted-foreground">
          You decided {decided} of {total}. The remaining items are later-me problems.
        </p>
        <div className="flex gap-2">
          <Link href={`/${moveId}/dashboard`} className={buttonVariants()}>
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => setIndex(0)}
            className={buttonVariants({ variant: "secondary" })}
          >
            Start over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Item {index + 1} of {total}
          </span>
          <span className="tabular-nums">
            {decided} decided · {progressPct}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div key={current.id} aria-live="polite">
        <TriageCard item={current} />
      </div>

      <div
        className={cn(
          "grid grid-cols-2 gap-2 md:grid-cols-4",
          isPending && "pointer-events-none opacity-60",
        )}
      >
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.value}
              type="button"
              onClick={() => decide(action.value)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 rounded-lg border border-transparent px-4 py-4 text-sm font-medium transition-colors",
                action.className,
              )}
            >
              <Icon className="size-5" />
              <span>{action.label}</span>
              <kbd className="rounded bg-background/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {action.hint}
              </kbd>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${moveId}/decide/${current.id}`}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            <HelpCircle className="mr-1.5 size-4" /> Help me decide
            <kbd className="ml-2 rounded bg-background/60 px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
              /
            </kbd>
          </Link>
          <Link
            href={`/${moveId}/inventory/item/${current.id}`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <Pencil className="mr-1.5 size-4" /> Edit details
          </Link>
        </div>
        <Button variant="ghost" size="sm" onClick={skip}>
          <Clock className="mr-1.5 size-4" /> Decide later
          <kbd className="ml-2 rounded bg-background/60 px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
            L
          </kbd>
        </Button>
      </div>
    </div>
  );
}
