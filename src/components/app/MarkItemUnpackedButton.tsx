"use client";

import { useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { removeItemFromBox } from "@/actions/boxes";
import { cn } from "@/lib/utils";

export function MarkItemUnpackedButton({
  boxId,
  itemId,
  name,
}: {
  boxId: string;
  itemId: string;
  name: string;
}) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (isPending) return;
    startTransition(async () => {
      try {
        await removeItemFromBox(boxId, itemId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't mark unpacked");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-label={`Mark ${name} unpacked`}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors",
        "hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400",
        "disabled:opacity-50",
      )}
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-5" />}
    </button>
  );
}
