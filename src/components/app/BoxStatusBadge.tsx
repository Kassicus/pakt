import { Badge } from "@/components/ui/badge";
import type { BoxStatus } from "@/lib/validators";

const LABELS: Record<BoxStatus, string> = {
  empty: "Empty",
  packing: "Packing",
  sealed: "Sealed",
  loaded: "Loaded",
  in_transit: "In transit",
  delivered: "Delivered",
  unpacked: "Unpacked",
};

const VARIANTS: Record<BoxStatus, "secondary" | "outline" | "default" | "destructive"> = {
  empty: "outline",
  packing: "secondary",
  sealed: "secondary",
  loaded: "secondary",
  in_transit: "default",
  delivered: "default",
  unpacked: "default",
};

export function BoxStatusBadge({ status }: { status: BoxStatus }) {
  return (
    <Badge variant={VARIANTS[status]} className="tabular-nums">
      {LABELS[status]}
    </Badge>
  );
}
