import { describe, expect, it } from "vitest";
import {
  formatCompactDollars,
  formatDollars,
  formatSignedDollars,
} from "./format";

describe("formatSignedDollars", () => {
  it("always shows a sign and groups thousands", () => {
    expect(formatSignedDollars(1234.5)).toBe("+$1,234.50");
    expect(formatSignedDollars(-80)).toBe("−$80.00");
    expect(formatSignedDollars(0)).toBe("+$0.00");
  });

  it("respects the number of decimals", () => {
    expect(formatSignedDollars(12.345, 0)).toBe("+$12");
  });
});

describe("formatDollars", () => {
  it("only marks negatives", () => {
    expect(formatDollars(1500)).toBe("$1,500.00");
    expect(formatDollars(-621)).toBe("−$621.00");
  });
});

describe("formatCompactDollars", () => {
  it("shortens thousands and millions", () => {
    expect(formatCompactDollars(1500)).toBe("$1.5k");
    expect(formatCompactDollars(8000)).toBe("$8k");
    expect(formatCompactDollars(-2000)).toBe("−$2k");
    expect(formatCompactDollars(2_500_000)).toBe("$2.5m");
  });

  it("rounds small amounts to whole dollars", () => {
    expect(formatCompactDollars(0)).toBe("$0");
    expect(formatCompactDollars(-148.5)).toBe("−$149");
    expect(formatCompactDollars(999.4)).toBe("$999");
  });
});