"use client";

import { useState, useTransition } from "react";
import { Loader2, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  deleteChecklistItem,
  toggleChecklistItem,
  updateChecklistItem,
} from "@/actions/checklist";

export type ChecklistRowProps = {
  id: string;
  text: string;
  done: boolean;
};

export function ChecklistRow({ id, text, done }: ChecklistRowProps) {
  const [isPending, startTransition] = useTransition();
  const [optimisticDone, setOptimisticDone] = useState<boolean | null>(null);
  const checked = optimisticDone ?? done;

  function onToggle(next: boolean) {
    if (isPending) return;
    setOptimisticDone(next);
    const fd = new FormData();
    fd.set("itemId", id);
    fd.set("done", next ? "true" : "false");
    startTransition(async () => {
      try {
        await toggleChecklistItem(fd);
      } catch (err) {
        setOptimisticDone(null);
        toast.error(err instanceof Error ? err.message : "Couldn't update");
      }
    });
  }

  function onRename() {
    const next = prompt("Edit task:", text);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === text) return;
    const fd = new FormData();
    fd.set("itemId", id);
    fd.set("text", trimmed);
    startTransition(async () => {
      try {
        await updateChecklistItem(fd);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't update");
      }
    });
  }

  function onDelete() {
    if (!confirm(`Delete "${text}"?`)) return;
    const fd = new FormData();
    fd.set("itemId", id);
    startTransition(async () => {
      try {
        await deleteChecklistItem(fd);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't delete");
      }
    });
  }

  return (
    <li className="flex items-center gap-3 py-2.5">
      <Checkbox checked={checked} onCheckedChange={(v) => onToggle(Boolean(v))} />
      <span
        className={cn(
          "min-w-0 flex-1 text-sm",
          checked && "text-muted-foreground line-through",
        )}
      >
        {text}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${text}`}
          disabled={isPending}
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <MoreVertical className="size-4" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={onRename}>
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
