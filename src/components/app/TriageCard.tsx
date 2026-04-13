import Image from "next/image";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CategoryPlaceholder } from "./CategoryPlaceholder";

export type TriageItem = {
  id: string;
  name: string;
  quantity: number;
  categoryId: string | null;
  categoryLabel: string | null;
  sourceRoomLabel: string | null;
  fragility: "normal" | "fragile" | "very_fragile";
  notes: string | null;
  photoUrl: string | null;
};

export function TriageCard({ item }: { item: TriageItem }) {
  return (
    <article className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="relative aspect-[4/3] bg-muted">
        {item.photoUrl ? (
          <Image
            src={item.photoUrl}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, 640px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <CategoryPlaceholder categoryId={item.categoryId} className="h-full w-full rounded-none" />
        )}
        {item.fragility !== "normal" && (
          <Badge
            variant="outline"
            className="absolute right-3 top-3 border-destructive/40 bg-background/90 text-destructive backdrop-blur"
          >
            <AlertTriangle className="mr-1 size-3.5" />
            {item.fragility === "very_fragile" ? "Very fragile" : "Fragile"}
          </Badge>
        )}
      </div>
      <div className="space-y-2 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">{item.name}</h2>
          {item.quantity > 1 && (
            <div className="text-sm tabular-nums text-muted-foreground">× {item.quantity}</div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
          {item.categoryLabel && <span>{item.categoryLabel}</span>}
          {item.sourceRoomLabel && (
            <>
              <span>·</span>
              <span>{item.sourceRoomLabel}</span>
            </>
          )}
        </div>
        {item.notes && (
          <p className="pt-1 text-sm leading-relaxed text-muted-foreground">{item.notes}</p>
        )}
      </div>
    </article>
  );
}
