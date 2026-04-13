"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadPhotoFromFile } from "@/lib/blob";
import { attachPhoto, deletePhoto } from "@/actions/photos";

export type ExistingPhoto = {
  id: string;
  url: string;
};

export function ItemPhotoManager({
  itemId,
  moveId,
  photos: initial,
}: {
  itemId: string;
  moveId: string;
  photos: ExistingPhoto[];
}) {
  const [photos, setPhotos] = useState<ExistingPhoto[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        try {
          const uploaded = await uploadPhotoFromFile(file, moveId);
          const { photoId } = await attachPhoto({
            itemId,
            blobPathname: uploaded.pathname,
            url: uploaded.url,
            width: uploaded.width || undefined,
            height: uploaded.height || undefined,
            byteSize: uploaded.byteSize,
            contentType: uploaded.contentType,
          });
          setPhotos((p) => [...p, { id: photoId, url: uploaded.url }]);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Upload failed");
        }
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function remove(id: string) {
    setRemovingId(id);
    startTransition(async () => {
      try {
        await deletePhoto(id);
        setPhotos((p) => p.filter((x) => x.id !== id));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't delete");
      } finally {
        setRemovingId(null);
      }
    });
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        multiple
        onChange={onFiles}
        className="sr-only"
      />
      <div className="flex gap-2 overflow-x-auto pb-1">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="relative size-24 shrink-0 overflow-hidden rounded-lg border bg-muted"
          >
            <Image
              src={photo.url}
              alt=""
              width={96}
              height={96}
              className="h-full w-full object-cover"
              unoptimized
            />
            <button
              type="button"
              onClick={() => remove(photo.id)}
              disabled={isPending && removingId === photo.id}
              aria-label="Delete photo"
              className={cn(
                "absolute right-1 top-1 inline-flex size-7 items-center justify-center rounded-md bg-black/60 text-white transition-colors",
                "hover:bg-destructive disabled:opacity-50",
              )}
            >
              {isPending && removingId === photo.id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={cn(
            "flex size-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground transition-colors",
            "hover:border-foreground/40 hover:bg-muted hover:text-foreground",
            uploading && "opacity-50",
          )}
        >
          {uploading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <>
              <Camera className="size-5" />
              <span className="text-xs">Add photo</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
