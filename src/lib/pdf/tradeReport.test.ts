import { describe, expect, it } from "vitest";
import { EMPTY_FILTERS } from "@/lib/calculations";
import { makeTrade } from "@/lib/calculations/testHelpers";
import {
  buildTradeReport,
  describeFilters,
  pdfCompactMoney,
  pdfMoney,
  pdfSafe,
  tradesPdfFilename,
} from "./tradeReport";
import { renderTradeReport } from "./renderTradeReport";

const OPTIONS = { filters: [], generatedOn: "2026-11-02" };

const trades = [
  makeTrade({ date: "2026-10-30", pair: "EURUSD", direction: "long", pnl: 150, rMultiple: 1.5, tag: "Breakout" }),
  makeTrade({ date: "2026-10-28", pair: "GBPUSD", direction: "short", pnl: -50, rMultiple: -0.5, tag: "" }),
  makeTrade({ date: "2026-10-29", pair: "BTCUSDT", direction: "long", pnl: 1250.5, rMultiple: null, session: "Asian" }),
];

describe("pdfSafe", () => {
  it("swaps characters the PDF fonts cannot draw", () => {
    expect(pdfSafe("a\u2212b \u2013 c\u2019s \u201cx\u201d\u2026")).toBe("a-b - c's \"x\"...");
    expect(pdfSafe("café")).toBe("café");
    expect(pdfSafe("EUR🙂")).toBe("EUR??");
    expect(pdfSafe("line\none")).toBe("line one");
  });
});

describe("money", () => {
  it("uses a plain hyphen and thousands separators", () => {
    expect(pdfMoney(1234.5)).toBe("+$1,234.50");
    expect(pdfMoney(-80)).toBe("-$80.00");
    expect(pdfMoney(0)).toBe("+$0.00");
    expect(pdfMoney(1234.5, false)).toBe("$1,234.50");
    expect(pdfCompactMoney(1500)).toBe("$1.5k");
    expect(pdfCompactMoney(-2000)).toBe("-$2k");
    expect(pdfCompactMoney(0)).toBe("$0");
  });
});

describe("describeFilters", () => {
  it("is empty when nothing is filtered", () => {
    expect(describeFilters(EMPTY_FILTERS)).toEqual([]);
  });

  it("lists each active filter in words", () => {
    const parts = describeFilters({
      ...EMPTY_FILTERS,
      search: " breakout ",
      market: "forex",
      direction: "short",
      result: "loss",
      session: "London",
      from: "2026-10-01",
      to: "2026-10-26",
    });
    expect(parts).toEqual([
      'Search "breakout"',
      "Market: Forex",
      "Direction: Short",
      "Result: Losses",
      "Session: London",
      "Dates: Oct 1 - Oct 26",
    ]);
  });
});

describe("buildTradeReport", () => {
  const model = buildTradeReport(trades, OPTIONS);
  const stat = (label: string): string => model.stats.find((s) => s.label === label)!.value;

  it("summarises the trades", () => {
    expect(stat("Trades")).toBe("3");
    expect(stat("Net P&L")).toBe("+$1,350.50");
    expect(stat("Win rate")).toBe("67%");
    expect(stat("Wins / losses")).toBe("2 / 1");
    expect(stat("Largest gain")).toBe("+$1,250.50");
    expect(stat("Largest loss")).toBe("-$50.00");
    expect(stat("Profit factor")).toBe("28.01");
    expect(stat("Average R")).toBe("0.50R");
  });

  it("describes the period from the first to the last trade", () => {
    expect(model.period).toBe("Oct 28, 2026 to Oct 30, 2026");
    expect(buildTradeReport([trades[0]!], OPTIONS).period).toBe("Oct 30, 2026");
  });

  it("keeps the table in the order given and fills gaps with dashes", () => {
    expect(model.rows.map((r) => r.cells[1])).toEqual(["EURUSD", "GBPUSD", "BTCUSDT"]);
    expect(model.rows[0]).toEqual({
      cells: ["2026-10-30", "EURUSD", "Long", "London", "Breakout", "1.5R", "+$150.00"],
      tone: "good",
    });
    expect(model.rows[1]?.cells.slice(4)).toEqual(["-", "-0.5R", "-$50.00"]);
    expect(model.rows[1]?.tone).toBe("bad");
    expect(model.rows[2]?.cells[5]).toBe("-");
  });

  it("draws the equity line from oldest to newest, whatever the table order", () => {
    expect(model.equity).toEqual([-50, 1200.5, 1350.5]);
  });

  it("handles an empty journal", () => {
    const empty = buildTradeReport([], OPTIONS);
    expect(empty.period).toBe("No trades");
    expect(empty.rows).toEqual([]);
    expect(empty.stats.find((s) => s.label === "Net P&L")?.value).toBe("-");
    expect(empty.stats.find((s) => s.label === "Win rate")?.value).toBe("-");
  });

  it("makes free text safe for the PDF fonts", () => {
    const odd = buildTradeReport([makeTrade({ tag: "Range \u2013 fade 🙂" })], OPTIONS);
    expect(odd.rows[0]?.cells[4]).toBe("Range - fade ??");
  });
});

describe("tradesPdfFilename", () => {
  it("includes the date", () => {
    expect(tradesPdfFilename("2026-11-02")).toBe("marked-report-2026-11-02.pdf");
  });
});

describe("renderTradeReport", () => {
  const pdfText = (doc: ReturnType<typeof renderTradeReport>): string =>
    Buffer.from(doc.output("arraybuffer")).toString("latin1");

  it("makes a one-page PDF for a few trades", () => {
    const doc = renderTradeReport(buildTradeReport(trades, OPTIONS));
    expect(doc.getNumberOfPages()).toBe(1);
    expect(pdfText(doc).startsWith("%PDF-")).toBe(true);
  });

  it("flows a long journal onto more pages", () => {
    const many = Array.from({ length: 150 }, (_, i) =>
      makeTrade({ date: "2026-10-01", pnl: i % 2 === 0 ? 10 : -5, tag: "A very long setup name that will not fit in its column at all" }),
    );
    const doc = renderTradeReport(buildTradeReport(many, OPTIONS));
    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
  });

  it("renders an empty journal without throwing", () => {
    expect(() => renderTradeReport(buildTradeReport([], OPTIONS))).not.toThrow();
  });
});