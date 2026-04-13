"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateItem } from "@/actions/items";
import { enqueue, isNetworkError } from "@/lib/offline";
import { AdvancedOverrides } from "./AdvancedOverrides";

export type RoomOption = { id: string; label: string };
export type CategoryOption = {
  id: string;
  label: string;
  volumeCuFt: number | null;
  weightLbs: number | null;
};

export type EditItemInitial = {
  itemId: string;
  name: string;
  categoryId: string;
  quantity: number;
  fragility: "normal" | "fragile" | "very_fragile";
  sourceRoomId: string | null;
  destinationRoomId: string | null;
  notes: string | null;
  volumeCuFtOverride: string | null;
  weightLbsOverride: string | null;
};

export function EditItemForm({
  initial,
  categories,
  originRooms,
  destinationRooms,
}: {
  initial: EditItemInitial;
  categories: CategoryOption[];
  originRooms: RoomOption[];
  destinationRooms: RoomOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(initial.name);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [quantity, setQuantity] = useState(String(initial.quantity));
  const [fragility, setFragility] = useState<EditItemInitial["fragility"]>(
    initial.fragility,
  );
  const [sourceRoomId, setSourceRoomId] = useState(initial.sourceRoomId ?? "");
  const [destinationRoomId, setDestinationRoomId] = useState(
    initial.destinationRoomId ?? "",
  );
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [volumeOverride, setVolumeOverride] = useState(initial.volumeCuFtOverride ?? "");
  const [weightOverride, setWeightOverride] = useState(initial.weightLbsOverride ?? "");

  const selectedCategory = categories.find((c) => c.id === categoryId);

  async function enqueueOffline() {
    await enqueue({
      kind: "updateItem",
      payload: {
        itemId: initial.itemId,
        name: name.trim(),
        categoryId,
        quantity: Number(quantity) || 1,
        fragility,
        sourceRoomId,
        destinationRoomId,
        notes: notes.trim(),
        volumeCuFtOverride: volumeOverride.trim(),
        weightLbsOverride: weightOverride.trim(),
      },
    });
    toast("Saved offline — will sync when online");
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueOffline();
        return;
      }
      const fd = new FormData();
      fd.set("itemId", initial.itemId);
      fd.set("name", name.trim());
      fd.set("categoryId", categoryId);
      fd.set("quantity", quantity);
      fd.set("fragility", fragility);
      fd.set("sourceRoomId", sourceRoomId);
      fd.set("destinationRoomId", destinationRoomId);
      fd.set("notes", notes.trim());
      fd.set("volumeCuFtOverride", volumeOverride.trim());
      fd.set("weightLbsOverride", weightOverride.trim());
      try {
        await updateItem(fd);
        toast.success("Saved");
      } catch (err) {
        if (isNetworkError(err)) {
          await enqueueOffline();
          return;
        }
        toast.error(err instanceof Error ? err.message : "Couldn't save");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={120}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="categoryId">Category</Label>
          <Select
            value={categoryId}
            onValueChange={(v) => setCategoryId(v ?? "")}
            items={Object.fromEntries(categories.map((c) => [c.id, c.label]))}
          >
            <SelectTrigger id="categoryId">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="quantity">Qty</Label>
          <Input
            id="quantity"
            type="number"
            min={1}
            max={999}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-24"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Source room</Label>
          <Select
            value={sourceRoomId}
            onValueChange={(v) => setSourceRoomId(v ?? "")}
            items={Object.fromEntries(originRooms.map((r) => [r.id, r.label]))}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {originRooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Destination room</Label>
          <Select
            value={destinationRoomId}
            onValueChange={(v) => setDestinationRoomId(v ?? "")}
            items={Object.fromEntries(destinationRooms.map((r) => [r.id, r.label]))}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {destinationRooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Fragility</Label>
        <Select
          value={fragility}
          onValueChange={(v) => {
            if (v === "normal" || v === "fragile" || v === "very_fragile")
              setFragility(v);
          }}
          items={{
            normal: "Normal",
            fragile: "Fragile",
            very_fragile: "Very fragile",
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="fragile">Fragile</SelectItem>
            <SelectItem value="very_fragile">Very fragile</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={500}
        />
      </div>

      <AdvancedOverrides
        categoryVolume={selectedCategory?.volumeCuFt ?? null}
        categoryWeight={selectedCategory?.weightLbs ?? null}
        volumeValue={volumeOverride}
        weightValue={weightOverride}
        onVolumeChange={setVolumeOverride}
        onWeightChange={setWeightOverride}
      />

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending || !name.trim()}>
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Save changes
        </Button>
      </div>
    </form>
  );
}
