import { describe, expect, it } from "vitest";
import {
  findDuplicateRows,
  marketForSymbol,
  normalizeSymbol,
  parseBrokerCsv,
  parseBrokerNumber,
  parseBrokerTime,
  sessionForHour,
} from "./parseBrokerCsv";
import { makeTrade } from "@/lib/calculations/testHelpers";

const OPTS = { utcOffsetHours: 2 };

const MT5_POSITIONS = [
  "Time,Position,Symbol,Type,Volume,Price,S / L,T / P,Time,Price,Commission,Swap,Profit",
  "2026.10.30 09:15:02,10001,EURUSD,buy,0.50,1.08500,1.08300,1.08900,2026.10.30 11:40:10,1.08800,-3.50,-0.20,150.00",
  "2026.10.29 17:05:00,10002,GBPUSD.m,sell,1.00,1.27000,1.27200,1.26500,2026.10.29 19:00:00,1.27150,-7.00,0.00,-150.00",
  "2026.10.28 02:00:00,10003,BTCUSD,buy,0.10,67000.00,0,0,2026.10.28 05:00:00,67500.00,0.00,0.00,50.00",
  ",,,balance,,,,,,,,,1 000.00",
].join("\n");

const MT4_CLOSED = [
  "Ticket,Open Time,Type,Size,Item,Price,S / L,T / P,Close Time,Price,Commission,Taxes,Swap,Profit",
  "5001,2026.10.20 08:00:00,sell,0.20,XAUUSD,2650.00,2660.00,2630.00,2026.10.20 13:30:00,2640.00,-1.00,0.00,-0.50,200.00",
  "5002,2026.10.21 14:00:00,buy,0.10,USDJPY,150.000,149.500,151.000,2026.10.21 15:00:00,149.800,0.00,0.00,0.00,-13.35",
  "5003,2026.10.22 10:00:00,balance,,,,,,2026.10.22 10:00:00,,,,,5 000.00",
].join("\n");

const MT5_DEALS = [
  "Time,Deal,Symbol,Type,Direction,Volume,Price,Order,Commission,Fee,Swap,Profit,Balance,Comment",
  "2026.10.27 09:00:00,1,,balance,,,,,0.00,0.00,0.00,10000.00,10000.00,Deposit",
  "2026.10.27 09:10:00,2,EURUSD,buy,in,0.50,1.08000,11,-3.50,0.00,0.00,0.00,10000.00,",
  "2026.10.27 12:10:00,3,EURUSD,sell,out,0.50,1.08400,12,0.00,0.00,-0.30,200.00,10199.70,tp",
  "2026.10.27 13:00:00,4,USDJPY,sell,in,0.10,150.000,13,-1.00,0.00,0.00,0.00,10199.70,",
  "2026.10.27 15:00:00,5,USDJPY,buy,out,0.10,150.500,14,0.00,0.00,0.00,-33.20,10166.50,sl",
].join("\n");

describe("parseBrokerCsv: positions layout", () => {
  it("reads MT5 positions and adds costs to the profit", () => {
    const result = parseBrokerCsv(MT5_POSITIONS, OPTS);
    expect(result.layout).toBe("positions");
    expect(result.fileError).toBeNull();
    expect(result.ignoredCount).toBe(1);
    const trades = result.rows.map((r) => r.trade!);
    expect(trades).toHaveLength(3);

    expect(trades[0]).toMatchObject({
      date: "2026-10-30",
      pair: "EURUSD",
      market: "forex",
      direction: "long",
      pnl: 146.3,
      calcMode: "manual",
      risk: null,
      rMultiple: null,
      pips: null,
    });
    expect(trades[0]?.notes).toContain("10001");
    expect(trades[1]).toMatchObject({ pair: "GBPUSD", direction: "short", pnl: -157 });
    expect(trades[2]).toMatchObject({ pair: "BTCUSD", market: "crypto" });
  });

  it("picks the session from the open time, shifted by the broker offset", () => {
    const trades = parseBrokerCsv(MT5_POSITIONS, OPTS).rows.map((r) => r.trade!);
    expect(trades[0]?.session).toBe("London"); 
    expect(trades[1]?.session).toBe("Overlap");
    expect(trades[2]?.session).toBe("Asian");
  });

  it("reads MT4 closed trades with Open Time / Close Time columns and taxes", () => {
    const result = parseBrokerCsv(MT4_CLOSED, OPTS);
    expect(result.layout).toBe("positions");
    expect(result.ignoredCount).toBe(1);
    const [gold, yen] = result.rows.map((r) => r.trade!);
    expect(gold).toMatchObject({ pair: "XAUUSD", market: "forex", direction: "short", pnl: 198.5 });
    expect(yen).toMatchObject({ pair: "USDJPY", direction: "long", pnl: -13.35 });
  });
});

describe("parseBrokerCsv: deals layout", () => {
  it("keeps only closing deals and flips the direction", () => {
    const result = parseBrokerCsv(MT5_DEALS, OPTS);
    expect(result.layout).toBe("deals");
    expect(result.ignoredCount).toBe(3); // balance + two entries
    const [euro, yen] = result.rows.map((r) => r.trade!);
    // A closing sell ends a long trade.
    expect(euro).toMatchObject({ pair: "EURUSD", direction: "long", pnl: 199.7, date: "2026-10-27" });
    expect(yen).toMatchObject({ pair: "USDJPY", direction: "short", pnl: -33.2 });
  });
});

describe("parseBrokerCsv: odd files", () => {
  it("handles semicolons, tabs, a BOM and report preamble lines", () => {
    const body = MT5_POSITIONS.split("\n").map((l) => l.replace(/,/g, ";")).join("\n");
    const withPreamble = "\ufeffTrade History Report\nAccount: 123\n\n" + body;
    const result = parseBrokerCsv(withPreamble, OPTS);
    expect(result.fileError).toBeNull();
    expect(result.rows.filter((r) => r.trade)).toHaveLength(3);

    const tabbed = MT5_POSITIONS.split("\n").map((l) => l.replace(/,/g, "\t")).join("\n");
    expect(parseBrokerCsv(tabbed, OPTS).rows.filter((r) => r.trade)).toHaveLength(3);
  });

  it("stops at a second table in the same report", () => {
    const text = MT5_POSITIONS + "\nTime,Deal,Symbol,Type,Direction,Volume,Price,Order,Commission,Fee,Swap,Profit\n2026.10.30 10:00:00,9,EURUSD,sell,out,1,1,1,0,0,0,999";
    const result = parseBrokerCsv(text, OPTS);
    expect(result.rows.filter((r) => r.trade)).toHaveLength(3);
  });

  it("reports rows it can't read instead of dropping them", () => {
    const text = [
      "Ticket,Open Time,Type,Size,Item,Price,Close Time,Price,Commission,Swap,Profit",
      "1,2026.10.20 08:00:00,buy,0.1,EURUSD,1.1,not a date,1.2,0,0,10",
      "2,2026.10.20 08:00:00,buy,0.1,EURUSD,1.1,2026.10.20 09:00:00,1.2,0,0,abc",
    ].join("\n");
    const rows = parseBrokerCsv(text, OPTS).rows;
    expect(rows[0]).toMatchObject({ rowNumber: 2, trade: null, error: "Couldn't read the close time." });
    expect(rows[1]).toMatchObject({ rowNumber: 3, trade: null, error: "Missing or invalid profit." });
  });

  it("explains a file that is not a broker history", () => {
    const result = parseBrokerCsv("date,pair,pnl\n2026-10-01,EURUSD,10", OPTS);
    expect(result.layout).toBeNull();
    expect(result.rows).toEqual([]);
    expect(result.fileError).toMatch(/MT4 or MT5/);
  });
});

describe("helpers", () => {
  it("normalises broker symbols", () => {
    expect(normalizeSymbol("EURUSD.m")).toBe("EURUSD");
    expect(normalizeSymbol("eurusdm")).toBe("EURUSD");
    expect(normalizeSymbol("XAUUSD#")).toBe("XAUUSD");
    expect(normalizeSymbol("GBPJPY.pro")).toBe("GBPJPY");
    expect(normalizeSymbol("US30")).toBe("US30");
  });

  it("tells crypto from forex", () => {
    expect(marketForSymbol("ETHUSD")).toBe("crypto");
    expect(marketForSymbol("EURUSD")).toBe("forex");
  });

  it("reads broker numbers", () => {
    expect(parseBrokerNumber("1 234.50")).toBe(1234.5);
    expect(parseBrokerNumber("1\u00a0234.50")).toBe(1234.5);
    expect(parseBrokerNumber("1,234.50")).toBe(1234.5);
    expect(parseBrokerNumber("1,234")).toBe(1234);
    expect(parseBrokerNumber("12,5")).toBe(12.5);
    expect(parseBrokerNumber("\u221212.3")).toBe(-12.3);
    expect(parseBrokerNumber("")).toBeNull();
    expect(parseBrokerNumber("abc")).toBeNull();
    expect(parseBrokerNumber(undefined)).toBeNull();
  });

  it("reads broker times", () => {
    expect(parseBrokerTime("2026.10.30 14:05:11")).toEqual({ date: "2026-10-30", hour: 14 });
    expect(parseBrokerTime("2026-10-30 09:00")).toEqual({ date: "2026-10-30", hour: 9 });
    expect(parseBrokerTime("2026.13.30 09:00")).toBeNull();
    expect(parseBrokerTime("30/10/2026")).toBeNull();
    expect(parseBrokerTime("")).toBeNull();
  });

  it("maps hours to sessions, wrapping around midnight", () => {
    expect(sessionForHour(9, 0)).toBe("London");
    expect(sessionForHour(13, 0)).toBe("Overlap");
    expect(sessionForHour(18, 0)).toBe("New York");
    expect(sessionForHour(23, 0)).toBe("Asian");
    expect(sessionForHour(1, 2)).toBe("Asian"); 
    expect(sessionForHour(10, 2)).toBe("London"); 
  });
});

describe("findDuplicateRows", () => {
  const rows = parseBrokerCsv(MT5_POSITIONS, OPTS).rows;

  it("flags rows already in the journal", () => {
    const existing = [makeTrade({ date: "2026-10-30", pair: "eurusd", direction: "long", pnl: 146.3 })];
    expect([...findDuplicateRows(rows, existing)]).toEqual([2]);
  });

  it("returns nothing when the journal has no matches", () => {
    expect(findDuplicateRows(rows, [makeTrade({ date: "2026-10-30", pnl: 1 })]).size).toBe(0);
  });

  it("only skips as many rows as the journal already holds", () => {
    const twin = (n: number) => `${n},2026.10.20 08:00:00,buy,0.1,EURUSD,1.1,2026.10.20 09:00:00,1.2,0,0,10`;
    const text = ["Ticket,Open Time,Type,Size,Item,Price,Close Time,Price,Commission,Swap,Profit", twin(1), twin(2), twin(3)].join("\n");
    const twins = parseBrokerCsv(text, OPTS).rows;
    const existing = [makeTrade({ date: "2026-10-20", pair: "EURUSD", direction: "long", pnl: 10 })];
    expect([...findDuplicateRows(twins, existing)]).toEqual([2]);
  });
});