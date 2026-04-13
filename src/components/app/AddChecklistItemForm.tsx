"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addChecklistItem } from "@/actions/checklist";
import {
  CHECKLIST_CATEGORY_LABEL,
  CHECKLIST_CATEGORY_ORDER,
  type ChecklistCategory,
} from "@/lib/checklist-defaults";

export function AddChecklistItemForm({ moveId }: { moveId: string }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<ChecklistCategory>("week");
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!text.trim()) return;
    const fd = new FormData();
    fd.set("moveId", moveId);
    fd.set("text", text.trim());
    fd.set("category", category);
    startTransition(async () => {
      try {
        await addChecklistItem(fd);
        setText("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't add task");
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3"
    >
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a task…"
        maxLength={200}
        className="min-w-0 flex-1"
      />
      <Select
        value={category}
        onValueChange={(v) => v && setCategory(v as ChecklistCategory)}
        items={Object.fromEntries(
          CHECKLIST_CATEGORY_ORDER.map((c) => [c, CHECKLIST_CATEGORY_LABEL[c]]),
        )}
      >
        <SelectTrigger className="min-w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CHECKLIST_CATEGORY_ORDER.map((c) => (
            <SelectItem key={c} value={c}>
              {CHECKLIST_CATEGORY_LABEL[c]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="submit" disabled={isPending || !text.trim()}>
        {isPending ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <Plus className="mr-2 size-4" />
        )}
        Add
      </Button>
    </form>
  );
}
