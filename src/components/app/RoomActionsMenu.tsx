"use client";

import { useTransition } from "react";
import { MoreVertical, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteRoom, renameRoom } from "@/actions/rooms";

export function RoomActionsMenu({
  roomId,
  roomLabel,
  itemCount,
}: {
  roomId: string;
  roomLabel: string;
  itemCount: number;
}) {
  const [isPending, startTransition] = useTransition();

  function onRename() {
    const next = prompt(`Rename "${roomLabel}" to:`, roomLabel);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === roomLabel) return;

    const fd = new FormData();
    fd.set("roomId", roomId);
    fd.set("label", trimmed);
    startTransition(async () => {
      try {
        await renameRoom(fd);
        toast.success(`Renamed to "${trimmed}"`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't rename room");
      }
    });
  }

  function onDelete() {
    const warning =
      itemCount > 0
        ? `Delete "${roomLabel}"? The ${itemCount} item${itemCount === 1 ? "" : "s"} in it will keep existing but lose their room assignment.`
        : `Delete "${roomLabel}"?`;
    if (!confirm(warning)) return;

    const fd = new FormData();
    fd.set("roomId", roomId);
    startTransition(async () => {
      try {
        await deleteRoom(fd);
        toast.success(`Deleted ${roomLabel}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't delete room");
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={`Actions for ${roomLabel}`}
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <MoreVertical className="size-4" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onRename} disabled={isPending}>
            <Pencil className="mr-2 size-4" />
            Rename
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onClick={onDelete}
            disabled={isPending}
          >
            <Trash2 className="mr-2 size-4" />
            Delete room
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
