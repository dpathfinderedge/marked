import { describe, expect, it } from "vitest";
import { hasProAccess, PERIOD_GRACE_MS } from "./subscription";

const END = "2026-11-20T00:00:00.000Z";
const endMs = Date.parse(END);
const at = (ms: number): Date => new Date(ms);

describe("hasProAccess", () => {
  describe("free and past_due", () => {
    it("never grants access", () => {
      for (const status of ["free", "past_due"] as const) {
        expect(
          hasProAccess(
            { status, cancelAtPeriodEnd: false, currentPeriodEnd: END },
            at(endMs - 1000),
          ),
        ).toBe(false);
      }
    });
  });

  describe("active, renewing", () => {
    it("is Pro, even long after the stored date (renewal events can lag)", () => {
      const input = {
        status: "active",
        cancelAtPeriodEnd: false,
        currentPeriodEnd: END,
      } as const;
      expect(hasProAccess(input, at(endMs - 1000))).toBe(true);
      expect(hasProAccess(input, at(endMs + 30 * PERIOD_GRACE_MS))).toBe(true);
    });

    it("is Pro with no date on record", () => {
      expect(
        hasProAccess({
          status: "active",
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
        }),
      ).toBe(true);
    });
  });

  describe("active but cancelling", () => {
    const input = {
      status: "active",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: END,
    } as const;

    it("keeps Pro until the paid period ends", () => {
      expect(hasProAccess(input, at(endMs - 1000))).toBe(true);
    });

    it("allows a one-day grace after the end date", () => {
      expect(hasProAccess(input, at(endMs + PERIOD_GRACE_MS - 1))).toBe(true);
    });

    it("loses Pro once the grace has passed", () => {
      expect(hasProAccess(input, at(endMs + PERIOD_GRACE_MS))).toBe(false);
      expect(hasProAccess(input, at(endMs + 10 * PERIOD_GRACE_MS))).toBe(false);
    });

    it("keeps Pro when the end date is unknown rather than locking out a payer", () => {
      expect(hasProAccess({ ...input, currentPeriodEnd: null })).toBe(true);
      expect(hasProAccess({ ...input, currentPeriodEnd: "garbage" })).toBe(true);
    });
  });

  describe("cancelled", () => {
    const input = {
      status: "cancelled",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: END,
    } as const;

    it("keeps Pro for the time already paid for", () => {
      expect(hasProAccess(input, at(endMs - 1000))).toBe(true);
    });

    it("loses Pro after the paid period (plus grace)", () => {
      expect(hasProAccess(input, at(endMs + PERIOD_GRACE_MS))).toBe(false);
    });

    it("has no access when there is no usable end date", () => {
      expect(hasProAccess({ ...input, currentPeriodEnd: null })).toBe(false);
      expect(hasProAccess({ ...input, currentPeriodEnd: "garbage" })).toBe(false);
    });
  });
});