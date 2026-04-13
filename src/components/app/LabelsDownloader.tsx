"use client";

import { useMemo, useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

export type LabelPreview = {
  id: string;
  shortCode: string;
  size: string;
  fragile: boolean;
  destinationRoomLabel: string | null;
  sourceRoomLabel: string | null;
  qrSvg: string;
};

const SIZE_LABEL: Record<string, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  dish_pack: "Dish pack",
  wardrobe: "Wardrobe",
  tote: "Tote",
};

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
        const res = await fetch(zipHref);
        if (!res.ok) throw new Error(`ZIP failed: ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const disposition = res.headers.get("Content-Disposition") ?? "";
        const match = disposition.match(/filename="([^"]+)"/);
        a.download = match?.[1] ?? "pakt-labels.zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "ZIP download failed");
      }
    });
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
                      {SIZE_LABEL[label.size] ?? label.size}
                    </div>
                    {label.destinationRoomLabel && (
                      <div className="mt-1 text-[9px] font-semibold leading-tight">
                        → {label.destinationRoomLabel}
                      </div>
                    )}
                  </div>
                  {label.fragile && (
                    <div className="self-start bg-black px-1 text-[6px] font-black tracking-widest text-white">
                      FRAGILE
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
                    {label.fragile && (
                      <Badge variant="outline" className="border-destructive/40 text-destructive">
                        Fragile
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {SIZE_LABEL[label.size] ?? label.size}
                    {label.destinationRoomLabel && ` · → ${label.destinationRoomLabel}`}
                  </div>
                </div>
                <div className="pt-2">
                  <a
                    href={`/api/labels/${label.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline"
                    download
                  >
                    <Download className="size-3.5" /> Download PNG
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
