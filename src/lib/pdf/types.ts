import type { BoxCountResult, TruckRecommendation } from "@/lib/predictions";
import type { Disposition } from "@/lib/validators";

export type InventoryRoomGroup = {
  roomId: string | null;
  roomLabel: string;
  items: InventoryPdfItem[];
};

export type InventoryPdfItem = {
  id: string;
  name: string;
  quantity: number;
  fragility: "normal" | "fragile" | "very_fragile";
  disposition: Disposition;
  categoryLabel: string | null;
  destinationLabel: string | null;
  boxShortCode: string | null;
  notes: string | null;
};

export type DispositionTotals = Record<Disposition, number>;

export type InventoryPdfData = {
  move: {
    id: string;
    name: string;
    plannedMoveDate: string | null;
    originAddress: string | null;
    destinationAddress: string | null;
  };
  generatedAt: Date;
  totals: {
    items: number;
    quantity: number;
    byDisposition: DispositionTotals;
  };
  prediction: BoxCountResult;
  truck: TruckRecommendation;
  groups: InventoryRoomGroup[];
};
