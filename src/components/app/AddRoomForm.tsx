"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addRoom } from "@/actions/rooms";

export type ParentOption = {
  id: string;
  label: string;
};

const NO_PARENT = "__none__";

export function AddRoomForm({
  moveId,
  parentOptions = [],
}: {
  moveId: string;
  parentOptions?: ParentOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [parentId, setParentId] = useState<string>(NO_PARENT);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!label.trim()) return;
    const fd = new FormData();
    fd.set("moveId", moveId);
    fd.set("kind", "origin");
    fd.set("label", label.trim());
    fd.set("parentRoomId", parentId === NO_PARENT ? "" : parentId);
    startTransition(async () => {
      try {
        await addRoom(fd);
        setLabel("");
        setParentId(NO_PARENT);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't add room");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border bg-card p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="room-label" className="text-xs">
            Room name
          </Label>
          <Input
            id="room-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Garage, Walk-in closet, Basement…"
            maxLength={80}
          />
        </div>
        {parentOptions.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="room-parent" className="text-xs">
              Inside of <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Select
              value={parentId}
              onValueChange={(v) => setParentId(v ?? NO_PARENT)}
              items={{
                [NO_PARENT]: "— Top-level room",
                ...Object.fromEntries(parentOptions.map((p) => [p.id, p.label])),
              }}
            >
              <SelectTrigger id="room-parent" className="min-w-48">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PARENT}>— Top-level room</SelectItem>
                {parentOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || !label.trim()}>
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Plus className="mr-2 size-4" />
          )}
          Add room
        </Button>
      </div>
    </form>
  );
}
