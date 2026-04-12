import { describe, it, expect } from "vitest";
import {
  predictBoxCounts,
  recommendTruck,
  scoreDecision,
  type PredictionItem,
} from "./predictions";

function item(
  overrides: Partial<PredictionItem> & { volumeCuFt: number; recommendedBoxType: PredictionItem["recommendedBoxType"] },
): PredictionItem {
  return {
    categoryId: null,
    quantity: 1,
    weightLbs: 2,
    disposition: "moving",
    ...overrides,
  };
}

describe("predictBoxCounts", () => {
  it("returns zero when no items are moving/storage", () => {
    const r = predictBoxCounts([
      item({ volumeCuFt: 0.15, recommendedBoxType: "small", disposition: "donate" }),
      item({ volumeCuFt: 0.15, recommendedBoxType: "small", disposition: "trash" }),
    ]);
    expect(r.totalBoxCount).toBe(0);
    expect(r.totalBoxCuFt).toBe(0);
  });

  it("rolls up small-box items correctly", () => {
    // 20 books at 0.15 cuft = 3 cuft total
    // small box capacity = 1.5 * 0.85 = 1.275
    // ceil(3 / 1.275) = 3 boxes
    const books = Array.from({ length: 20 }, () =>
      item({ volumeCuFt: 0.15, recommendedBoxType: "small" }),
    );
    const r = predictBoxCounts(books);
    expect(r.boxesByType.small).toBe(3);
    expect(r.totalBoxCount).toBe(3);
  });

  it("separates loose furniture from boxable items", () => {
    const r = predictBoxCounts([
      item({ volumeCuFt: 8, recommendedBoxType: "none" }),
      item({ volumeCuFt: 0.25, recommendedBoxType: "large", quantity: 10 }),
    ]);
    expect(r.looseFurnitureCuFt).toBe(8);
    // 2.5 cuft clothes / (4.5 * 0.85 = 3.825) = 1 large box
    expect(r.boxesByType.large).toBe(1);
  });

  it("1BR apartment golden fixture produces a reasonable total", () => {
    const fixture: PredictionItem[] = [
      ...Array.from({ length: 30 }, () =>
        item({ volumeCuFt: 0.15, recommendedBoxType: "small" }),
      ),
      ...Array.from({ length: 20 }, () =>
        item({ volumeCuFt: 0.25, recommendedBoxType: "large" }),
      ),
      ...Array.from({ length: 15 }, () =>
        item({ volumeCuFt: 0.25, recommendedBoxType: "dish_pack" }),
      ),
      ...Array.from({ length: 3 }, () =>
        item({ volumeCuFt: 20, recommendedBoxType: "none", weightLbs: 80 }),
      ),
      item({ volumeCuFt: 35, recommendedBoxType: "none", weightLbs: 65 }),
    ];
    const r = predictBoxCounts(fixture);
    expect(r.totalBoxCount).toBeGreaterThan(5);
    expect(r.totalBoxCount).toBeLessThan(20);
    expect(r.looseFurnitureCuFt).toBe(95);
  });
});

describe("recommendTruck", () => {
  it("recommends 10ft for a very small load", () => {
    const r = recommendTruck([
      ...Array.from({ length: 30 }, () =>
        item({ volumeCuFt: 0.15, recommendedBoxType: "small" }),
      ),
    ]);
    expect(r.size).toBe("10ft");
    expect(r.heavyItemCount).toBe(0);
  });

  it("scales up when the load is large", () => {
    const heavy = Array.from({ length: 10 }, () =>
      item({ volumeCuFt: 50, recommendedBoxType: "none", weightLbs: 180 }),
    );
    const r = recommendTruck(heavy);
    expect(["15ft", "20ft", "26ft", "oversized"]).toContain(r.size);
    expect(r.size).not.toBe("10ft");
    expect(r.heavyItemCount).toBe(10);
  });

  it("returns oversized when volume exceeds 26ft capacity", () => {
    const huge = Array.from({ length: 50 }, () =>
      item({ volumeCuFt: 50, recommendedBoxType: "none", weightLbs: 180 }),
    );
    const r = recommendTruck(huge);
    expect(r.size).toBe("oversized");
    expect(r.cuft).toBeNull();
  });

  it("3BR fixture lands in 20ft or 26ft", () => {
    const fixture: PredictionItem[] = [
      ...Array.from({ length: 200 }, () =>
        item({ volumeCuFt: 0.15, recommendedBoxType: "small" }),
      ),
      ...Array.from({ length: 120 }, () =>
        item({ volumeCuFt: 0.25, recommendedBoxType: "large" }),
      ),
      ...Array.from({ length: 80 }, () =>
        item({ volumeCuFt: 0.25, recommendedBoxType: "dish_pack" }),
      ),
      ...Array.from({ length: 12 }, () =>
        item({ volumeCuFt: 50, recommendedBoxType: "none", weightLbs: 180 }),
      ),
      ...Array.from({ length: 6 }, () =>
        item({ volumeCuFt: 20, recommendedBoxType: "none", weightLbs: 80 }),
      ),
      item({ volumeCuFt: 45, recommendedBoxType: "none", weightLbs: 80 }),
    ];
    const r = recommendTruck(fixture);
    expect(["20ft", "26ft"]).toContain(r.size);
  });
});

describe("scoreDecision", () => {
  it("recommends donate for an unused cheap item the user wouldn't buy again", () => {
    const r = scoreDecision({
      lastUsedMonths: 36,
      replacementCostUsd: 20,
      sentimental: false,
      wouldBuyAgain: "no",
    });
    expect(r.recommendation).toBe("donate");
    expect(r.score).toBeLessThan(-0.35);
  });

  it("recommends keep for a sentimental expensive used-recently item", () => {
    const r = scoreDecision({
      lastUsedMonths: 1,
      replacementCostUsd: 800,
      sentimental: true,
      wouldBuyAgain: "yes",
    });
    expect(r.recommendation).toBe("keep");
    expect(r.score).toBeGreaterThan(0.35);
  });

  it("returns toss_up for truly mixed signals", () => {
    const r = scoreDecision({
      lastUsedMonths: 12,
      replacementCostUsd: 75,
      sentimental: false,
      wouldBuyAgain: "unsure",
    });
    expect(r.recommendation).toBe("toss_up");
  });

  it("handles missing answers without crashing", () => {
    const r = scoreDecision({ sentimental: true });
    expect(r.recommendation).toBe("keep");
  });

  it("returns toss_up with empty inputs", () => {
    const r = scoreDecision({});
    expect(r.recommendation).toBe("toss_up");
  });
});
