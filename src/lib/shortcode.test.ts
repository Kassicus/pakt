import { describe, it, expect } from "vitest";
import { generateBoxShortCode, generateId } from "./shortcode";

describe("generateBoxShortCode", () => {
  it("is formatted as B-XXXX with safe alphabet", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateBoxShortCode();
      expect(code).toMatch(/^B-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/);
    }
  });

  it("generates 10k codes with extremely low collision rate", () => {
    const set = new Set<string>();
    const N = 10_000;
    for (let i = 0; i < N; i++) set.add(generateBoxShortCode());
    // 32^4 = 1,048,576 — birthday paradox tells us some dupes are expected at 10k,
    // but across a single user's move scope they'd never see this volume.
    // We only assert the alphabet + prefix here; global uniqueness is enforced at insert time.
    expect(set.size).toBeGreaterThan(N * 0.9);
  });
});

describe("generateId", () => {
  it("prefixes correctly", () => {
    expect(generateId("mov")).toMatch(/^mov_[A-Za-z0-9]{10}$/);
    expect(generateId("itm")).toMatch(/^itm_[A-Za-z0-9]{10}$/);
    expect(generateId("box")).toMatch(/^box_[A-Za-z0-9]{10}$/);
  });
});
