"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdvancedOverrides({
  categoryVolume,
  categoryWeight,
  volumeValue,
  weightValue,
  onVolumeChange,
  onWeightChange,
}: {
  categoryVolume: number | null;
  categoryWeight: number | null;
  volumeValue: string;
  weightValue: string;
  onVolumeChange: (v: string) => void;
  onWeightChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(
    volumeValue.trim() !== "" || weightValue.trim() !== "",
  );

  return (
    <div className="rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium"
      >
        <span>Advanced — volume &amp; weight overrides</span>
        {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      </button>
      {open && (
        <div className="space-y-3 border-t p-4">
          <p className="text-xs text-muted-foreground">
            Overrides take priority over category defaults in dashboard predictions.
            Leave blank to use the default.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="volumeCuFtOverride" className="text-xs">
                Volume (cu ft)
              </Label>
              <Input
                id="volumeCuFtOverride"
                type="number"
                step="0.01"
                min={0}
                value={volumeValue}
                onChange={(e) => onVolumeChange(e.target.value)}
                placeholder={
                  categoryVolume !== null ? `Default ${categoryVolume.toFixed(2)}` : ""
                }
              />
              {categoryVolume !== null && (
                <p className="text-xs text-muted-foreground">
                  Category default: {categoryVolume.toFixed(2)} cu ft
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weightLbsOverride" className="text-xs">
                Weight (lb)
              </Label>
              <Input
                id="weightLbsOverride"
                type="number"
                step="0.1"
                min={0}
                value={weightValue}
                onChange={(e) => onWeightChange(e.target.value)}
                placeholder={
                  categoryWeight !== null ? `Default ${categoryWeight.toFixed(1)}` : ""
                }
              />
              {categoryWeight !== null && (
                <p className="text-xs text-muted-foreground">
                  Category default: {categoryWeight.toFixed(1)} lb
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
