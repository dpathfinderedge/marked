import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseTradesCsv,
  resolveCrossPairRates,
} from "./parseTradesCsv";
import * as fxModule from "@/lib/fx/fetchFxRate";

const HEADER =
  "date,market,pair,direction,session,tag,entryPrice,exitPrice,lots,contractSize,customContractUnits,quantity,risk,manualPnl,notes";

describe("parseTradesCsv", () => {
  it("parses a valid forex row using the same math as manual entry", () => {
    const csv = [
      HEADER,
      "2026-08-01,forex,EURUSD,long,London,breakout,1.1000,1.1050,1,standard,,,50,,test",
    ].join("\n");

    const result = parseTradesCsv(csv);
    expect(result.errorCount).toBe(0);
    expect(result.rows[0]?.trade?.pnl).toBeCloseTo(500, 2);
  });

  it("requires manualPnl OR flags a cross pair as pending rate lookup", () => {
    const csv = [
      HEADER,
      "2026-08-01,forex,EURGBP,long,London,,0.86,0.865,1,standard,,,,,",
    ].join("\n");

    const result = parseTradesCsv(csv);
    expect(result.errorCount).toBe(1);
    expect(result.rows[0]?.error).toMatch(/manualPnl/);
    expect(result.rows[0]?.pendingCrossPair).toBeDefined();
    expect(result.rows[0]?.pendingCrossPair?.pair).toBe("EURGBP");
  });

  it("still accepts a cross pair when manualPnl is supplied (no pendingCrossPair)", () => {
    const csv = [
      HEADER,
      "2026-08-01,forex,EURGBP,long,London,,0.86,0.865,1,standard,,,,120,",
    ].join("\n");

    const result = parseTradesCsv(csv);
    expect(result.errorCount).toBe(0);
    expect(result.rows[0]?.trade?.pnl).toBe(120);
    expect(result.rows[0]?.pendingCrossPair).toBeUndefined();
  });
});

describe("resolveCrossPairRates", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("prices pending cross-pair rows using a fetched rate", async () => {
    vi.spyOn(fxModule, "fetchFxRate").mockResolvedValue({
      rate: 1.27,
      date: "2026-08-24",
    });

    const csv = [
      HEADER,
      "2026-08-01,forex,EURGBP,long,London,,0.86,0.865,1,standard,,,,,",
    ].join("\n");

    const { rows } = parseTradesCsv(csv);
    const resolved = await resolveCrossPairRates(rows);

    expect(resolved[0]?.error).toBeNull();
    expect(resolved[0]?.trade?.pnl).toBeCloseTo(635, 2);
    expect(resolved[0]?.trade?.calcMode).toBe("manual");
  });

  it("fetches each distinct quote currency only once across many rows", async () => {
    const fetchSpy = vi
      .spyOn(fxModule, "fetchFxRate")
      .mockResolvedValue({ rate: 1.27, date: "2026-08-24" });

    const csv = [
      HEADER,
      "2026-08-01,forex,EURGBP,long,London,,0.86,0.865,1,standard,,,,,",
      "2026-08-02,forex,CHFGBP,long,London,,1.15,1.16,1,standard,,,,,",
      "2026-08-03,forex,AUDGBP,long,London,,0.52,0.53,1,standard,,,,,",
    ].join("\n");

    const { rows } = parseTradesCsv(csv);
    await resolveCrossPairRates(rows);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith("GBP", "USD");
  });

  it("leaves a row erroring with an updated message when the rate fetch fails", async () => {
    vi.spyOn(fxModule, "fetchFxRate").mockRejectedValue(
      new fxModule.FxRateError("No rate available for GBP/USD."),
    );

    const csv = [
      HEADER,
      "2026-08-01,forex,EURGBP,long,London,,0.86,0.865,1,standard,,,,,",
    ].join("\n");

    const { rows } = parseTradesCsv(csv);
    const resolved = await resolveCrossPairRates(rows);

    expect(resolved[0]?.trade).toBeNull();
    expect(resolved[0]?.error).toMatch(/GBPUSD/);
    expect(resolved[0]?.pendingCrossPair).toBeDefined();
  });

  it("is a no-op when there are no pending cross-pair rows", async () => {
    const fetchSpy = vi.spyOn(fxModule, "fetchFxRate");

    const csv = [
      HEADER,
      "2026-08-01,forex,EURUSD,long,London,,1.1,1.105,1,standard,,,,,",
    ].join("\n");

    const { rows } = parseTradesCsv(csv);
    const resolved = await resolveCrossPairRates(rows);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(resolved).toEqual(rows);
  });

  it("leaves non-cross-pair rows completely untouched", async () => {
    vi.spyOn(fxModule, "fetchFxRate").mockResolvedValue({
      rate: 1.27,
      date: "2026-08-24",
    });

    const csv = [
      HEADER,
      "2026-08-01,forex,EURUSD,long,London,,1.1,1.105,1,standard,,,,,",
      "2026-08-02,forex,EURGBP,long,London,,0.86,0.865,1,standard,,,,,",
    ].join("\n");

    const { rows } = parseTradesCsv(csv);
    const resolved = await resolveCrossPairRates(rows);

    expect(resolved[0]).toEqual(rows[0]);
    expect(resolved[1]?.trade).not.toBeNull();
  });
});