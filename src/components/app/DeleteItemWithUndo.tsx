"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteItem, restoreItem } from "@/actions/items";

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

  function onDelete() {
    if (!confirm("Delete this item?")) return;
    const fd = new FormData();
    fd.set("itemId", itemId);
    startTransition(async () => {
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
        router.push(
          backToRoomId
            ? `/${moveId}/inventory/${backToRoomId}`
            : `/${moveId}/inventory`,
        );
      } catch (err) {
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
