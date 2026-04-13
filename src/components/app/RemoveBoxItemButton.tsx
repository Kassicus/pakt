"use client";

import { useTransition } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { removeItemFromBox } from "@/actions/boxes";

export function RemoveBoxItemButton({
  boxId,
  itemId,
}: {
  boxId: string;
  itemId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (isPending) return;
    startTransition(async () => {
      try {
        await removeItemFromBox(boxId, itemId);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't remove");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-label="Remove from box"
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
    </button>
  );
}
