import { describe, it, expect } from "vitest";
import { calculateRMultiple } from "./rMultiple";

describe("calculateRMultiple", () => {
  it("divides P&L by risk", () => {
    expect(calculateRMultiple(150, 50)).toBeCloseTo(3, 5);
  });

  it("returns null when risk is null", () => {
    expect(calculateRMultiple(150, null)).toBeNull();
  });

  it("returns null when risk is zero or negative", () => {
    expect(calculateRMultiple(150, 0)).toBeNull();
    expect(calculateRMultiple(150, -20)).toBeNull();
  });

  it("handles a losing trade (negative R)", () => {
    expect(calculateRMultiple(-75, 50)).toBeCloseTo(-1.5, 5);
  });
});