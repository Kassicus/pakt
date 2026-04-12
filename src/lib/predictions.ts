export type BoxType =
  | "small"
  | "medium"
  | "large"
  | "dish_pack"
  | "wardrobe"
  | "tote"
  | "none";

export const BOX_VOLUME_CUFT: Record<Exclude<BoxType, "none">, number> = {
  small: 1.5,
  medium: 3.0,
  large: 4.5,
  dish_pack: 5.2,
  wardrobe: 11.0,
  tote: 2.4,
};

export const BOX_FILL_EFFICIENCY = 0.85;
export const TRUCK_SAFETY_MARGIN = 1.15;
export const HEAVY_ITEM_THRESHOLD_LBS = 150;
export const FURNITURE_CATEGORY_IDS = new Set([
  "cat_furniture_small",
  "cat_furniture_medium",
  "cat_furniture_large",
  "cat_mattress_queen",
  "cat_mattress_king",
]);

export type TruckSize = "10ft" | "15ft" | "20ft" | "26ft" | "oversized";
export const TRUCKS: { size: Exclude<TruckSize, "oversized">; cuft: number; rooms: string }[] = [
  { size: "10ft", cuft: 402, rooms: "studio / light 1BR" },
  { size: "15ft", cuft: 764, rooms: "1–2 BR" },
  { size: "20ft", cuft: 1016, rooms: "2–3 BR" },
  { size: "26ft", cuft: 1682, rooms: "3–4 BR" },
];

export type PredictionItem = {
  categoryId: string | null;
  quantity: number;
  volumeCuFt: number;
  weightLbs: number;
  recommendedBoxType: BoxType;
  disposition: "undecided" | "moving" | "storage" | "donate" | "trash" | "sold";
};

export type BoxCountResult = {
  boxesByType: Record<Exclude<BoxType, "none">, number>;
  looseFurnitureCuFt: number;
  totalBoxCuFt: number;
  totalBoxCount: number;
};

export function predictBoxCounts(items: PredictionItem[]): BoxCountResult {
  const packable = items.filter(
    (i) => (i.disposition === "moving" || i.disposition === "storage") && i.recommendedBoxType !== "none",
  );
  const loose = items.filter(
    (i) => (i.disposition === "moving" || i.disposition === "storage") && i.recommendedBoxType === "none",
  );

  const volumesByType: Record<Exclude<BoxType, "none">, number> = {
    small: 0,
    medium: 0,
    large: 0,
    dish_pack: 0,
    wardrobe: 0,
    tote: 0,
  };

  for (const it of packable) {
    const type = it.recommendedBoxType as Exclude<BoxType, "none">;
    volumesByType[type] += it.volumeCuFt * it.quantity;
  }

  const boxesByType: Record<Exclude<BoxType, "none">, number> = {
    small: 0,
    medium: 0,
    large: 0,
    dish_pack: 0,
    wardrobe: 0,
    tote: 0,
  };
  let totalBoxCuFt = 0;
  for (const key of Object.keys(boxesByType) as Array<keyof typeof boxesByType>) {
    const capacity = BOX_VOLUME_CUFT[key] * BOX_FILL_EFFICIENCY;
    const n = volumesByType[key] > 0 ? Math.ceil(volumesByType[key] / capacity) : 0;
    boxesByType[key] = n;
    totalBoxCuFt += n * BOX_VOLUME_CUFT[key];
  }

  const looseFurnitureCuFt = loose.reduce(
    (acc, it) => acc + it.volumeCuFt * it.quantity,
    0,
  );
  const totalBoxCount = Object.values(boxesByType).reduce((a, b) => a + b, 0);

  return { boxesByType, looseFurnitureCuFt, totalBoxCuFt, totalBoxCount };
}

export type TruckRecommendation = {
  size: TruckSize;
  cuft: number | null;
  totalVolumeCuFt: number;
  sizedVolumeCuFt: number;
  note: string;
  heavyItemCount: number;
};

export function recommendTruck(items: PredictionItem[]): TruckRecommendation {
  const { totalBoxCuFt, looseFurnitureCuFt } = predictBoxCounts(items);
  const totalVolume = totalBoxCuFt + looseFurnitureCuFt;
  const sizedVolume = totalVolume * TRUCK_SAFETY_MARGIN;

  const heavyItemCount = items.filter(
    (i) =>
      (i.disposition === "moving" || i.disposition === "storage") &&
      i.weightLbs >= HEAVY_ITEM_THRESHOLD_LBS,
  ).length;

  const match = TRUCKS.find((t) => t.cuft >= sizedVolume);
  if (!match) {
    return {
      size: "oversized",
      cuft: null,
      totalVolumeCuFt: totalVolume,
      sizedVolumeCuFt: sizedVolume,
      note: "Too much for a single 26ft truck — consider a second trip, pods, or a professional mover.",
      heavyItemCount,
    };
  }

  return {
    size: match.size,
    cuft: match.cuft,
    totalVolumeCuFt: totalVolume,
    sizedVolumeCuFt: sizedVolume,
    note: `Fits in a ${match.size} truck (${match.rooms}).`,
    heavyItemCount,
  };
}

export type DecisionInputs = {
  lastUsedMonths?: number;
  replacementCostUsd?: number;
  sentimental?: boolean;
  wouldBuyAgain?: "yes" | "no" | "unsure";
};

type Weighted = { score: number; weight: number };

function mapLastUsed(months: number): number {
  if (months <= 0) return 1;
  if (months <= 6) return 1 - ((months - 0) / 6) * 0.7;
  if (months <= 12) return 0.3 - ((months - 6) / 6) * 0.3;
  if (months <= 24) return 0 - ((months - 12) / 12) * 0.5;
  if (months <= 36) return -0.5 - ((months - 24) / 12) * 0.5;
  return -1;
}

function mapReplacementCost(usd: number): number {
  if (usd < 25) return -0.5;
  if (usd < 100) return 0;
  if (usd < 500) return 0.5;
  return 1;
}

function mapWouldBuyAgain(v: "yes" | "no" | "unsure"): number {
  if (v === "yes") return 1;
  if (v === "no") return -1;
  return -0.2;
}

const DECISION_WEIGHTS = {
  lastUsed: 0.3,
  replacementCost: 0.15,
  sentimental: 0.25,
  wouldBuyAgain: 0.3,
};

export type DecisionOutput = {
  score: number;
  recommendation: "keep" | "donate" | "toss_up";
  reasons: string[];
};

export function scoreDecision(inputs: DecisionInputs): DecisionOutput {
  const weighted: Weighted[] = [];
  const reasons: string[] = [];

  if (inputs.lastUsedMonths !== undefined) {
    const s = mapLastUsed(inputs.lastUsedMonths);
    weighted.push({ score: s, weight: DECISION_WEIGHTS.lastUsed });
    if (inputs.lastUsedMonths >= 24)
      reasons.push(`Unused for ${inputs.lastUsedMonths}+ months`);
    else if (inputs.lastUsedMonths <= 3) reasons.push("Used recently");
  }

  if (inputs.replacementCostUsd !== undefined) {
    const s = mapReplacementCost(inputs.replacementCostUsd);
    weighted.push({ score: s, weight: DECISION_WEIGHTS.replacementCost });
    if (inputs.replacementCostUsd >= 500) reasons.push("Expensive to replace");
    else if (inputs.replacementCostUsd < 25) reasons.push("Cheap to replace");
  }

  if (inputs.sentimental !== undefined) {
    const s = inputs.sentimental ? 0.8 : 0;
    weighted.push({ score: s, weight: DECISION_WEIGHTS.sentimental });
    if (inputs.sentimental) reasons.push("Sentimental value");
  }

  if (inputs.wouldBuyAgain !== undefined) {
    const s = mapWouldBuyAgain(inputs.wouldBuyAgain);
    weighted.push({ score: s, weight: DECISION_WEIGHTS.wouldBuyAgain });
    if (inputs.wouldBuyAgain === "no") reasons.push("Wouldn't buy again");
    else if (inputs.wouldBuyAgain === "yes") reasons.push("Would buy again");
  }

  if (weighted.length === 0) {
    return { score: 0, recommendation: "toss_up", reasons: ["No answers provided"] };
  }

  const totalWeight = weighted.reduce((acc, w) => acc + w.weight, 0);
  const rawScore = weighted.reduce((acc, w) => acc + w.score * w.weight, 0);
  const score = Number((rawScore / totalWeight).toFixed(3));

  let recommendation: DecisionOutput["recommendation"];
  if (score >= 0.35) recommendation = "keep";
  else if (score <= -0.35) recommendation = "donate";
  else recommendation = "toss_up";

  return { score, recommendation, reasons };
}
