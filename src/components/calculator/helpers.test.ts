import { describe, expect, it } from "vitest";
import { formatMoney, formatPairPrice, formatTrimmed, parseNumber } from "./helpers";

describe("parseNumber", () => {
  it("reads numbers and treats blanks as not-a-number", () => {
    expect(parseNumber("1.25")).toBe(1.25);
    expect(parseNumber(" 10 ")).toBe(10);
    expect(parseNumber("")).toBeNaN();
    expect(parseNumber("   ")).toBeNaN();
    expect(parseNumber("abc")).toBeNaN();
  });
});

describe("formatTrimmed", () => {
  it("drops trailing zeros", () => {
    expect(formatTrimmed(1.5)).toBe("1.5");
    expect(formatTrimmed(2)).toBe("2");
    expect(formatTrimmed(0.123456789)).toBe("0.123457");
    expect(formatTrimmed(12.3456, 2)).toBe("12.35");
    expect(formatTrimmed(1234.5, 0)).toBe("1235");
  });

  it("shows a dash for values that aren't numbers", () => {
    expect(formatTrimmed(Number.NaN)).toBe("—");
    expect(formatTrimmed(Number.POSITIVE_INFINITY)).toBe("—");
  });
});

describe("formatMoney", () => {
  it("groups thousands and marks losses", () => {
    expect(formatMoney(1234.5)).toBe("$1,234.50");
    expect(formatMoney(-80)).toBe("−$80.00");
    expect(formatMoney(0)).toBe("$0.00");
  });
});

describe("formatPairPrice", () => {
  it("uses 3 decimals for yen pairs and 5 for the rest", () => {
    expect(formatPairPrice(150.5, "USDJPY")).toBe("150.500");
    expect(formatPairPrice(1.1, "EURUSD")).toBe("1.10000");
  });
});