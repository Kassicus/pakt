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
import { deleteBoxType, updateBoxType } from "@/actions/box-types";

export function BoxTypeActionsMenu({
  boxTypeId,
  label,
  volumeCuFt,
  boxCount,
}: {
  boxTypeId: string;
  label: string;
  volumeCuFt: string | null;
  boxCount: number;
}) {
  const [isPending, startTransition] = useTransition();

  function onRename() {
    const nextLabel = prompt(`Rename "${label}" to:`, label);
    if (nextLabel === null) return;
    const trimmedLabel = nextLabel.trim();
    if (!trimmedLabel) return;

    const nextVolume = prompt(
      "Volume in cubic feet (leave blank to clear):",
      volumeCuFt ?? "",
    );
    if (nextVolume === null) return;

    const fd = new FormData();
    fd.set("boxTypeId", boxTypeId);
    fd.set("label", trimmedLabel);
    fd.set("volumeCuFt", nextVolume.trim());
    startTransition(async () => {
      try {
        await updateBoxType(fd);
        toast.success(`Updated "${trimmedLabel}"`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update box type");
      }
    });
  }

  function onDelete() {
    const warning =
      boxCount > 0
        ? `"${label}" is used by ${boxCount} box${boxCount === 1 ? "" : "es"}. Reassign or delete those boxes first.`
        : `Delete "${label}"?`;
    if (boxCount > 0) {
      alert(warning);
      return;
    }
    if (!confirm(warning)) return;

    const fd = new FormData();
    fd.set("boxTypeId", boxTypeId);
    startTransition(async () => {
      try {
        await deleteBoxType(fd);
        toast.success(`Deleted ${label}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't delete box type");
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Actions for ${label}`}
        className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <MoreVertical className="size-4" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onRename} disabled={isPending}>
            <Pencil className="mr-2 size-4" />
            Edit
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            variant="destructive"
            onClick={onDelete}
            disabled={isPending || boxCount > 0}
          >
            <Trash2 className="mr-2 size-4" />
            Delete type
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
