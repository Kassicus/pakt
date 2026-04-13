"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type StagedPhoto = {
  id: string;
  file: File;
  previewUrl: string;
};

export function CameraCapture({
  photos,
  onChange,
  max = 1,
  disabled,
}: {
  photos: StagedPhoto[];
  onChange: (next: StagedPhoto[]) => void;
  max?: number;
  disabled?: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [decoding, setDecoding] = useState(false);

  function open() {
    if (disabled || decoding) return;
    fileInputRef.current?.click();
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setDecoding(true);
    const room = Math.max(0, max - photos.length);
    const take = files.slice(0, room);
    const staged: StagedPhoto[] = take.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    onChange([...photos, ...staged]);
    setDecoding(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function remove(id: string) {
    const next = photos.filter((p) => p.id !== id);
    const removed = photos.find((p) => p.id === id);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    onChange(next);
  }

  const full = photos.length >= max;

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        multiple={max > 1}
        onChange={onFiles}
        className="sr-only"
      />
      <div className="flex flex-wrap gap-2">
        {photos.map((p) => (
          <div
            key={p.id}
            className="relative size-16 overflow-hidden rounded-md border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.previewUrl} alt="Preview" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(p.id)}
              aria-label="Remove photo"
              className="absolute right-0.5 top-0.5 inline-flex size-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        {!full && (
          <button
            type="button"
            onClick={open}
            disabled={disabled || decoding}
            className={cn(
              "inline-flex size-16 items-center justify-center rounded-md border border-dashed text-muted-foreground transition-colors",
              "hover:border-foreground/40 hover:bg-muted hover:text-foreground",
              (disabled || decoding) && "opacity-50",
            )}
            aria-label="Add photo"
          >
            {decoding ? (
              <Loader2 className="size-5 animate-spin" />
            ) : photos.length === 0 ? (
              <Camera className="size-5" />
            ) : (
              <ImagePlus className="size-5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}
