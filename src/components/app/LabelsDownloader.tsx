"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Download, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BoxTagBadges, knownTags } from "@/components/app/BoxTagBadges";
import { BOX_TAG_LABELS } from "@/lib/validators";

export type LabelPreview = {
  id: string;
  shortCode: string;
  typeLabel: string | null;
  tags: string[];
  destinationRoomLabel: string | null;
  sourceRoomLabel: string | null;
  qrSvg: string;
};

function triggerBlobDownload(blob: Blob, name: string) {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

async function fetchBlob(url: string, fallbackName: string) {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `${res.status} ${res.statusText}${body ? `: ${body.slice(0, 200)}` : ""}`,
    );
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const name = match?.[1] ?? fallbackName;
  const type =
    blob.type || res.headers.get("Content-Type") || "application/octet-stream";
  return { blob, name, type };
}

async function fetchAndDownload(url: string, fallbackName: string) {
  const { blob, name } = await fetchBlob(url, fallbackName);
  triggerBlobDownload(blob, name);
}

/**
 * Fetches an image PNG and, on mobile, offers it via the Web Share API so the
 * user can tap "Save to Photos" (iOS) or "Save to Gallery" (Android) directly.
 * Falls back to a file download on desktop or unsupported browsers.
 */
async function fetchAndSaveImage(
  url: string,
  fallbackName: string,
  title: string,
) {
  const { blob, name, type } = await fetchBlob(url, fallbackName);

  if (typeof navigator !== "undefined" && typeof navigator.canShare === "function") {
    try {
      const file = new File([blob], name, { type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title });
        return;
      }
    } catch (err) {
      // User cancelled the share sheet — don't force a download.
      if (err instanceof Error && err.name === "AbortError") return;
      // Other share failures (security, unavailable, etc.) — fall through.
    }
  }

  triggerBlobDownload(blob, name);
}

function supportsImageShare(): boolean {
  if (typeof navigator === "undefined") return false;
  if (typeof navigator.canShare !== "function") return false;
  try {
    const probe = new File([new Blob(["x"], { type: "image/png" })], "probe.png", {
      type: "image/png",
    });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export function LabelsDownloader({
  moveId,
  labels,
  initialSelected,
}: {
  moveId: string;
  labels: LabelPreview[];
  initialSelected: Set<string>;
}) {
  const [selected, setSelected] = useState<Set<string>>(initialSelected);
  const [isPending, startTransition] = useTransition();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [canShareImages, setCanShareImages] = useState(false);

  useEffect(() => {
    setCanShareImages(supportsImageShare());
  }, []);

  const selectedCount = selected.size;
  const allSelected = labels.length > 0 && selected.size === labels.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === labels.length ? new Set() : new Set(labels.map((l) => l.id)),
    );
  }

  const zipHref = useMemo(() => {
    const ids = Array.from(selected).join(",");
    const base = `/api/labels/zip?m=${encodeURIComponent(moveId)}`;
    return ids ? `${base}&ids=${ids}` : base;
  }, [selected, moveId]);

  function downloadZip() {
    if (labels.length === 0) return;
    startTransition(async () => {
      try {
        await fetchAndDownload(zipHref, "pakt-labels.zip");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "ZIP download failed");
      }
    });
  }

  function saveOne(label: LabelPreview) {
    setDownloadingId(label.id);
    fetchAndSaveImage(
      `/api/labels/${label.id}`,
      `pakt-${label.shortCode}.png`,
      `pakt label ${label.shortCode}`,
    )
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Save failed");
      })
      .finally(() => setDownloadingId(null));
  }

  if (labels.length === 0) {
    return (
      <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
        Create some boxes first, then come back here to print labels.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
          <span>
            {selectedCount === 0
              ? "Select labels to download as a ZIP"
              : `${selectedCount} selected · downloads ${selectedCount} PNG${selectedCount === 1 ? "" : "s"}`}
          </span>
        </label>
        <Button
          onClick={downloadZip}
          disabled={isPending || selectedCount === 0}
          size="sm"
        >
          {isPending ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Download className="mr-2 size-4" />
          )}
          Download ZIP
        </Button>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {labels.map((label) => {
          const isSelected = selected.has(label.id);
          return (
            <li
              key={label.id}
              className={cn(
                "flex items-stretch gap-3 rounded-lg border bg-card p-3 transition-colors",
                isSelected && "border-primary/60 bg-primary/5",
              )}
            >
              <label className="flex shrink-0 items-start pt-1">
                <Checkbox checked={isSelected} onCheckedChange={() => toggle(label.id)} />
              </label>
              <div
                className="flex aspect-[4/3] w-32 shrink-0 items-stretch overflow-hidden rounded-md border bg-white p-2 text-black shadow-inner"
                aria-label={`Preview of label ${label.shortCode}`}
              >
                <div className="flex w-1/2 items-center justify-center">
                  <div
                    className="size-full"
                    dangerouslySetInnerHTML={{ __html: label.qrSvg }}
                  />
                </div>
                <div className="flex w-1/2 flex-col justify-between pl-1.5 text-left">
                  <div>
                    <div className="font-mono text-[11px] font-bold leading-none">
                      {label.shortCode}
                    </div>
                    <div className="mt-0.5 text-[7px] uppercase tracking-wider text-black/60">
                      {label.typeLabel ?? "—"}
                    </div>
                    {label.destinationRoomLabel && (
                      <div className="mt-1 text-[9px] font-semibold leading-tight">
                        → {label.destinationRoomLabel}
                      </div>
                    )}
                  </div>
                  {knownTags(label.tags).length > 0 && (
                    <div className="self-start bg-black px-1 text-[6px] font-black tracking-widest text-white">
                      {knownTags(label.tags)
                        .map((t) => BOX_TAG_LABELS[t].toUpperCase())
                        .join(" · ")}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-lg font-semibold tabular-nums">
                      {label.shortCode}
                    </span>
                    <BoxTagBadges tags={label.tags} />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {label.typeLabel ?? "—"}
                    {label.destinationRoomLabel && ` · → ${label.destinationRoomLabel}`}
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => saveOne(label)}
                    disabled={downloadingId === label.id}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    {downloadingId === label.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : canShareImages ? (
                      <Share2 className="size-3.5" />
                    ) : (
                      <Download className="size-3.5" />
                    )}
                    {canShareImages ? "Save to Photos" : "Download PNG"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
