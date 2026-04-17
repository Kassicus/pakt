"use client";

import { Button } from "@/components/ui/button";
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
import { BOX_TAG_LABELS, boxTags, type BoxTag } from "@/lib/validators";
import { useState } from "react";

export type RoomOption = { id: string; label: string };
export type BoxTypeOption = {
  id: string;
  label: string;
  volumeCuFt: string | null;
};

export function CreateBoxForm({
  moveId,
  boxTypes,
  originRooms,
  destinationRooms,
}: {
  moveId: string;
  boxTypes: BoxTypeOption[];
  originRooms: RoomOption[];
  destinationRooms: RoomOption[];
}) {
  const [boxTypeId, setBoxTypeId] = useState(boxTypes[0]?.id ?? "");
  const [sourceRoomId, setSourceRoomId] = useState("");
  const [destinationRoomId, setDestinationRoomId] = useState("");
  const [tags, setTags] = useState<Set<BoxTag>>(new Set());
  const [notes, setNotes] = useState("");

  function toggleTag(tag: BoxTag, checked: boolean) {
    setTags((prev) => {
      const next = new Set(prev);
      if (checked) next.add(tag);
      else next.delete(tag);
      return next;
    });
  }

  const typeItems = Object.fromEntries(boxTypes.map((t) => [t.id, t.label]));

  return (
    <form action={createBox} className="space-y-4">
      <input type="hidden" name="moveId" value={moveId} />
      <input type="hidden" name="boxTypeId" value={boxTypeId} />
      <input type="hidden" name="sourceRoomId" value={sourceRoomId} />
      <input type="hidden" name="destinationRoomId" value={destinationRoomId} />
      {Array.from(tags).map((tag) => (
        <input key={tag} type="hidden" name="tags" value={tag} />
      ))}

      <div className="space-y-2">
        <Label>Box type</Label>
        {boxTypes.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            No box types yet. Add one on the Box types page first.
          </p>
        ) : (
          <Select
            value={boxTypeId}
            onValueChange={(v) => setBoxTypeId(v ?? boxTypes[0]?.id ?? "")}
            items={typeItems}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {boxTypes.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Tags</legend>
        <p className="text-xs text-muted-foreground">
          Printed on the label so movers know how to handle this box.
        </p>
        <div className="flex flex-wrap gap-4">
          {boxTags.map((tag) => (
            <label key={tag} className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={tags.has(tag)}
                onCheckedChange={(v) => toggleTag(tag, Boolean(v))}
              />
              {BOX_TAG_LABELS[tag]}
            </label>
          ))}
        </div>
      </fieldset>

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
        <Button type="submit" disabled={boxTypes.length === 0}>
          Create box
        </Button>
      </div>
    </form>
  );
}
