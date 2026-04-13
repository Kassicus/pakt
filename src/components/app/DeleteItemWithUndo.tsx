"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteItem, restoreItem } from "@/actions/items";
import { enqueue, isNetworkError } from "@/lib/offline";

export function DeleteItemWithUndo({
  itemId,
  moveId,
  backToRoomId,
}: {
  itemId: string;
  moveId: string;
  backToRoomId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function navigateBack() {
    router.push(
      backToRoomId
        ? `/${moveId}/inventory/${backToRoomId}`
        : `/${moveId}/inventory`,
    );
  }

  async function enqueueOfflineDelete() {
    await enqueue({ kind: "deleteItem", payload: { itemId } });
    toast("Deleted offline — will sync when online");
    navigateBack();
  }

  function onDelete() {
    if (!confirm("Delete this item?")) return;
    startTransition(async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueOfflineDelete();
        return;
      }
      const fd = new FormData();
      fd.set("itemId", itemId);
      try {
        await deleteItem(fd);
        toast("Item deleted", {
          action: {
            label: "Undo",
            onClick: async () => {
              try {
                await restoreItem(itemId);
                toast.success("Restored");
                router.refresh();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Couldn't restore");
              }
            },
          },
          duration: 8000,
        });
        navigateBack();
      } catch (err) {
        if (isNetworkError(err)) {
          await enqueueOfflineDelete();
          return;
        }
        toast.error(err instanceof Error ? err.message : "Couldn't delete");
      }
    });
  }

  return (
    <Button variant="ghost" onClick={onDelete} disabled={isPending}>
      {isPending ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <Trash2 className="mr-2 size-4" />
      )}
      Delete item
    </Button>
  );
}
