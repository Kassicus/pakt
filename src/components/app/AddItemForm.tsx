"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
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
import { addItem } from "@/actions/items";
import { attachPhoto } from "@/actions/photos";
import { uploadPhotoFromFile } from "@/lib/blob";
import { enqueue, isNetworkError } from "@/lib/offline";
import { generateId } from "@/lib/shortcode";
import { CameraCapture, type StagedPhoto } from "./CameraCapture";

export type CategoryOption = {
  id: string;
  label: string;
  fragile: boolean;
};

export function AddItemForm({
  moveId,
  sourceRoomId,
  categories,
}: {
  moveId: string;
  sourceRoomId: string;
  categories: CategoryOption[];
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<StagedPhoto[]>([]);
  const nameRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setName("");
    setQuantity("1");
    setNotes("");
    setPhotos([]);
    nameRef.current?.focus();
  }

  async function enqueueOffline(stagedPhotos: StagedPhoto[]) {
    await enqueue({
      kind: "addItem",
      payload: {
        moveId,
        sourceRoomId,
        name: name.trim(),
        categoryId,
        quantity: Number(quantity) || 1,
        disposition: "undecided",
        fragility: "normal",
        notes: notes.trim(),
        clientItemId: generateId("itm"),
      },
    });
    if (stagedPhotos.length > 0) {
      toast("Saved offline — photos need a connection, edit later to add them");
      for (const s of stagedPhotos) URL.revokeObjectURL(s.previewUrl);
    } else {
      toast("Saved offline — will sync when online");
    }
    resetForm();
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim()) return;

    const stagedPhotos = photos;

    startTransition(async () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueOffline(stagedPhotos);
        return;
      }

      const fd = new FormData();
      fd.set("moveId", moveId);
      fd.set("sourceRoomId", sourceRoomId);
      fd.set("name", name.trim());
      fd.set("categoryId", categoryId);
      fd.set("quantity", quantity);
      fd.set("notes", notes.trim());

      try {
        const { itemId } = await addItem(fd);

        for (const staged of stagedPhotos) {
          try {
            const uploaded = await uploadPhotoFromFile(staged.file, moveId);
            await attachPhoto({
              itemId,
              blobPathname: uploaded.pathname,
              url: uploaded.url,
              width: uploaded.width || undefined,
              height: uploaded.height || undefined,
              byteSize: uploaded.byteSize,
              contentType: uploaded.contentType,
            });
          } catch (photoErr) {
            toast.error(
              photoErr instanceof Error
                ? `Photo upload: ${photoErr.message}`
                : "Photo upload failed",
            );
          } finally {
            URL.revokeObjectURL(staged.previewUrl);
          }
        }

        resetForm();
      } catch (err) {
        if (isNetworkError(err)) {
          await enqueueOffline(stagedPhotos);
          return;
        }
        toast.error(err instanceof Error ? err.message : "Couldn't add item");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border bg-card p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs">
            Item
          </Label>
          <Input
            id="name"
            ref={nameRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cast iron skillet"
            autoComplete="off"
            autoFocus
            required
            maxLength={120}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="categoryId" className="text-xs">
            Category
          </Label>
          <Select
            value={categoryId}
            onValueChange={(v) => setCategoryId(v ?? "")}
            items={Object.fromEntries(categories.map((c) => [c.id, c.label]))}
          >
            <SelectTrigger id="categoryId" className="min-w-40">
              <SelectValue placeholder="Category" />
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
          <Label htmlFor="quantity" className="text-xs">
            Qty
          </Label>
          <Input
            id="quantity"
            type="number"
            min={1}
            max={999}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-20 text-center"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Photo (optional)</Label>
        <CameraCapture photos={photos} onChange={setPhotos} max={1} disabled={isPending} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-xs">
          Notes <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Serial #, condition, room destination ideas…"
          rows={2}
          maxLength={500}
        />
      </div>

      <div className="flex items-center justify-end">
        <Button type="submit" disabled={isPending || !name.trim()}>
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Plus className="mr-2 size-4" />
          )}
          {isPending && photos.length > 0 ? "Uploading…" : "Add item"}
        </Button>
      </div>
    </form>
  );
}
