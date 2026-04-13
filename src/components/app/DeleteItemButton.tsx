"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deleteItem } from "@/actions/items";

export function DeleteItemButton({ itemId }: { itemId: string }) {
  const [isPending, startTransition] = useTransition();

  function onClick() {
    if (isPending) return;
    if (!confirm("Delete this item?")) return;
    const fd = new FormData();
    fd.set("itemId", itemId);
    startTransition(async () => {
      try {
        await deleteItem(fd);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't delete");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      aria-label="Delete item"
      className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Trash2 className="size-4" />
      )}
    </button>
  );
}
