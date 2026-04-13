"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addRoom } from "@/actions/rooms";

export function AddRoomForm({ moveId }: { moveId: string }) {
  const [isPending, startTransition] = useTransition();
  const [label, setLabel] = useState("");

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!label.trim()) return;
    const fd = new FormData();
    fd.set("moveId", moveId);
    fd.set("kind", "origin");
    fd.set("label", label.trim());
    startTransition(async () => {
      try {
        await addRoom(fd);
        setLabel("");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't add room");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Add a room (e.g. Garage)"
        maxLength={80}
      />
      <Button type="submit" disabled={isPending || !label.trim()}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
      </Button>
    </form>
  );
}
