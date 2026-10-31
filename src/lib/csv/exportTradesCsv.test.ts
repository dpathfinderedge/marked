import Papa from "papaparse";
import { describe, expect, it } from "vitest";
import { makeTrade } from "@/lib/calculations/testHelpers";
import {
  EXPORT_HEADERS,
  buildTradesCsv,
  guardFormula,
  tradesCsvFilename,
} from "./exportTradesCsv";

function parse(csv: string): Record<string, string>[] {
  const result = Papa.parse<Record<string, string>>(csv.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: true,
  });
  return result.data;
}

describe("buildTradesCsv", () => {
  it("starts with a byte-order mark and uses Windows line endings", () => {
    const csv = buildTradesCsv([makeTrade()]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("\r\n");
    expect(csv.replace("\uFEFF", "").split("\r\n")[0]).toBe(EXPORT_HEADERS.join(","));
  });

  it("is just the header when there are no trades", () => {
    expect(parse(buildTradesCsv([]))).toEqual([]);
    expect(buildTradesCsv([]).replace("\uFEFF", "")).toBe(`${EXPORT_HEADERS.join(",")}\r\n`);
  });

  it("writes every column", () => {
    const [row] = parse(
      buildTradesCsv([
        makeTrade({
          date: "2026-10-20",
          pair: "EURUSD",
          market: "forex",
          direction: "short",
          session: "New York",
          tag: "Breakout",
          pnl: -42.5,
          risk: 50,
          rMultiple: -0.85,
          pips: -12.5,
          calcMode: "converted",
          checklistPassed: 3,
          checklistTotal: 4,
          notes: "Chased it.",
        }),
      ]),
    );
    expect(row).toEqual({
      date: "2026-10-20",
      pair: "EURUSD",
      market: "forex",
      direction: "short",
      session: "New York",
      setup: "Breakout",
      pnl: "-42.5",
      risk: "50",
      r_multiple: "-0.85",
      pips: "-12.5",
      pnl_source: "converted",
      checklist: "3/4",
      notes: "Chased it.",
    });
  });

  it("leaves missing values empty", () => {
    const [row] = parse(buildTradesCsv([makeTrade({ pnl: 10 })]));
    expect(row).toMatchObject({ risk: "", r_multiple: "", pips: "", checklist: "", setup: "", notes: "" });
  });

  it("always ends with a line break", () => {
    expect(buildTradesCsv([makeTrade()]).endsWith("\r\n")).toBe(true);
    expect(buildTradesCsv([makeTrade(), makeTrade()]).endsWith("\r\n\r\n")).toBe(false);
  });

  it("keeps the order it was given", () => {
    const rows = parse(
      buildTradesCsv([makeTrade({ date: "2026-10-03" }), makeTrade({ date: "2026-10-01" })]),
    );
    expect(rows.map((r) => r.date)).toEqual(["2026-10-03", "2026-10-01"]);
  });

  it("survives commas, quotes, line breaks and accents in notes", () => {
    const notes = 'Said "wait", then went — 3 pips, café.\nSecond line,  with spaces ';
    const [row] = parse(buildTradesCsv([makeTrade({ notes })]));
    expect(row?.notes).toBe(notes);
  });

  it("stops text being read as a formula, but leaves numbers alone", () => {
    const [row] = parse(
      buildTradesCsv([
        makeTrade({ notes: "=HYPERLINK(\"http://x\")", tag: "+risky", pair: "@A", pnl: -15 }),
      ]),
    );
    expect(row?.notes).toBe("'=HYPERLINK(\"http://x\")");
    expect(row?.setup).toBe("'+risky");
    expect(row?.pair).toBe("'@A");
    expect(row?.pnl).toBe("-15");
  });
});

describe("guardFormula", () => {
  it("prefixes only text that starts with a formula character", () => {
    for (const bad of ["=1+1", "+1", "-1", "@SUM", "\tx"]) expect(guardFormula(bad)).toBe(`'${bad}`);
    for (const fine of ["Breakout", "a=b", "", "1-2"]) expect(guardFormula(fine)).toBe(fine);
  });
});

describe("tradesCsvFilename", () => {
  it("includes the date", () => {
    expect(tradesCsvFilename("2026-10-31")).toBe("marked-trades-2026-10-31.csv");
  });
});