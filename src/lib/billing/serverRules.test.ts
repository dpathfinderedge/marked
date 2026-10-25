import { describe, expect, it } from "vitest";
import {
  friendlyTradeError,
  friendlyUploadError,
  SCREENSHOT_PRO_MESSAGE,
  TRADE_LIMIT_MESSAGE,
} from "./serverRules";

describe("friendlyTradeError", () => {
  it("explains the free-plan limit", () => {
    expect(
      friendlyTradeError(
        "FREE_TRADE_LIMIT_REACHED: the free plan allows 50 trades a month.",
      ),
    ).toBe(TRADE_LIMIT_MESSAGE);
    expect(TRADE_LIMIT_MESSAGE).toContain("50 trades/month");
  });

  it("leaves other errors alone", () => {
    expect(friendlyTradeError("network down")).toBe("network down");
  });
});

describe("friendlyUploadError", () => {
  it("explains that screenshots are a Pro feature", () => {
    expect(
      friendlyUploadError(
        'new row violates row-level security policy for table "objects"',
      ),
    ).toBe(SCREENSHOT_PRO_MESSAGE);
    expect(
      friendlyUploadError(
        'new row violates row-level security policy for table "trade_attachments"',
      ),
    ).toBe(SCREENSHOT_PRO_MESSAGE);
  });

  it("leaves other errors alone", () => {
    expect(friendlyUploadError("The object exceeded the maximum size")).toBe(
      "The object exceeded the maximum size",
    );
  });
});