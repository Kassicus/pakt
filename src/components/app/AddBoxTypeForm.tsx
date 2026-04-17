"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBoxType } from "@/actions/box-types";

export function AddBoxTypeForm({ moveId }: { moveId: string }) {
  const [isPending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [volume, setVolume] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!label.trim()) return;
    const fd = new FormData();
    fd.set("moveId", moveId);
    fd.set("label", label.trim());
    fd.set("volumeCuFt", volume);
    startTransition(async () => {
      try {
        await createBoxType(fd);
        setLabel("");
        setVolume("");
        toast.success(`Added "${label.trim()}"`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't add box type");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border bg-card p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_160px_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="box-type-label" className="text-xs">
            Name
          </Label>
          <Input
            id="box-type-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Book box, Lamp carton…"
            maxLength={80}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="box-type-volume" className="text-xs">
            Volume (cuft)
          </Label>
          <Input
            id="box-type-volume"
            value={volume}
            onChange={(e) => setVolume(e.target.value)}
            placeholder="Optional"
            inputMode="decimal"
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={isPending || !label.trim()}>
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Plus className="mr-2 size-4" />
            )}
            Add type
          </Button>
        </div>
      </div>
    </form>
  );
}
