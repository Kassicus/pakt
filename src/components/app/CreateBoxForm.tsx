"use client";

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
import { Checkbox } from "@/components/ui/checkbox";
import { createBox } from "@/actions/boxes";
import { useState } from "react";

export type RoomOption = { id: string; label: string };

const SIZE_LABELS: Record<string, string> = {
  small: "Small (1.5 cuft)",
  medium: "Medium (3.0 cuft)",
  large: "Large (4.5 cuft)",
  dish_pack: "Dish pack (5.2 cuft)",
  wardrobe: "Wardrobe (11 cuft)",
  tote: "Tote (2.4 cuft)",
};

export function CreateBoxForm({
  moveId,
  originRooms,
  destinationRooms,
}: {
  moveId: string;
  originRooms: RoomOption[];
  destinationRooms: RoomOption[];
}) {
  const [size, setSize] = useState("medium");
  const [sourceRoomId, setSourceRoomId] = useState("");
  const [destinationRoomId, setDestinationRoomId] = useState("");
  const [fragile, setFragile] = useState(false);
  const [notes, setNotes] = useState("");

  return (
    <form action={createBox} className="space-y-4">
      <input type="hidden" name="moveId" value={moveId} />
      <input type="hidden" name="size" value={size} />
      <input type="hidden" name="sourceRoomId" value={sourceRoomId} />
      <input type="hidden" name="destinationRoomId" value={destinationRoomId} />
      <input type="hidden" name="fragile" value={fragile ? "on" : ""} />

      <div className="space-y-2">
        <Label>Box size</Label>
        <Select
          value={size}
          onValueChange={(v) => setSize(v ?? "medium")}
          items={SIZE_LABELS}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(SIZE_LABELS).map(([v, label]) => (
              <SelectItem key={v} value={v}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Packing in room</Label>
          <Select
            value={sourceRoomId}
            onValueChange={(v) => setSourceRoomId(v ?? "")}
            items={Object.fromEntries(originRooms.map((r) => [r.id, r.label]))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Optional" />
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
        <div className="space-y-2">
          <Label>Going to</Label>
          <Select
            value={destinationRoomId}
            onValueChange={(v) => setDestinationRoomId(v ?? "")}
            items={Object.fromEntries(destinationRooms.map((r) => [r.id, r.label]))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pick a destination room" />
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

      <div className="flex items-center gap-2">
        <Checkbox
          id="fragile"
          checked={fragile}
          onCheckedChange={(v) => setFragile(Boolean(v))}
        />
        <Label htmlFor="fragile" className="cursor-pointer">
          Fragile — mark the label
        </Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional — anything the unpacker should know."
          rows={2}
          maxLength={500}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit">Create box</Button>
      </div>
    </form>
  );
}
