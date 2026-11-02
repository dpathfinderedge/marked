import { describe, expect, it } from "vitest";
import {
  decodeStatementFile,
  htmlToRows,
  looksLikeHtml,
  parseBrokerStatement,
} from "./parseBrokerHtml";

const OPTS = { utcOffsetHours: 2 };

const MT4_STATEMENT = `<html><head><title>Statement: 123456</title><style>td { color: #000 }</style></head><body>
<table cellspacing=1 cellpadding=3 border=0>
<tr align=left><td colspan=14><b>Account: 123456 &nbsp;&nbsp; Name: Alex</b></td></tr>
<tr align=left><td colspan=14><b>Closed Transactions:</b></td></tr>
<tr align=center bgcolor="#C0C0C0"><td>Ticket</td><td>Open Time</td><td>Type</td><td>Size</td><td>Item</td><td>Price</td><td>S / L</td><td>T / P</td><td>Close Time</td><td>Price</td><td>Commission</td><td>Taxes</td><td>Swap</td><td>Profit</td></tr>
<tr align=right><td>5001</td><td class=msdate nowrap>2026.10.20 08:00:00</td><td>sell</td><td class=mspt>0.20</td><td>xauusd</td><td class=mspt>2 650.00</td><td class=mspt>2 660.00</td><td class=mspt>2 630.00</td><td class=msdate nowrap>2026.10.20 13:30:00</td><td class=mspt>2 640.00</td><td class=mspt>-1.00</td><td class=mspt>0.00</td><td class=mspt>-0.50</td><td class=mspt>1 200.00</td></tr>
<tr align=right bgcolor="#E0E0E0"><td>5002</td><td class=msdate nowrap>2026.10.21 14:00:00</td><td>buy</td><td class=mspt>0.10</td><td>usdjpy</td><td class=mspt>150.000</td><td class=mspt>149.500</td><td class=mspt>151.000</td><td class=msdate nowrap>2026.10.21 15:00:00</td><td class=mspt>149.800</td><td class=mspt>0.00</td><td class=mspt>0.00</td><td class=mspt>0.00</td><td class=mspt>-13.35</td></tr>
<tr align=right><td>5003</td><td class=msdate nowrap>2026.10.22 10:00:00</td><td>balance</td><td colspan=10>Deposit</td><td class=mspt>5 000.00</td></tr>
<tr align=right><td>5004</td><td class=msdate nowrap>2026.10.22 10:00:00</td><td>buy limit</td><td class=mspt>0.10</td><td>eurusd</td><td class=mspt>1.1</td><td>0</td><td>0</td><td class=msdate nowrap>2026.10.22 12:00:00</td><td>1.1</td><td>0</td><td>0</td><td>0</td><td>0.00</td></tr>
<tr align=right><td colspan=10><b>Closed P/L:</b></td><td class=mspt>-1.00</td><td class=mspt>0.00</td><td class=mspt>-0.50</td><td class=mspt>1 186.65</td></tr>
<tr align=left><td colspan=14><b>Open Trades:</b></td></tr>
<tr align=center bgcolor="#C0C0C0"><td>Ticket</td><td>Open Time</td><td>Type</td><td>Size</td><td>Item</td><td>Price</td><td>S / L</td><td>T / P</td><td></td><td>Price</td><td>Commission</td><td>Taxes</td><td>Swap</td><td>Profit</td></tr>
<tr align=right><td>6001</td><td>2026.10.30 09:00:00</td><td>buy</td><td>0.10</td><td>eurusd</td><td>1.1</td><td>0</td><td>0</td><td></td><td>1.2</td><td>0</td><td>0</td><td>0</td><td>999.00</td></tr>
</table></body></html>`;

const MT5_REPORT = `<html><body><table>
<tr><th colspan=13>Trade History Report</th></tr>
<tr><td>Name:</td><td colspan=12>Alex</td></tr>
<tr><th colspan=13>Positions</th></tr>
<tr bgcolor="#E5F0FC"><td align=center><b>Time</b></td><td align=center><b>Position</b></td><td align=center><b>Symbol</b></td><td align=center><b>Type</b></td><td align=center><b>Volume</b></td><td align=center><b>Price</b></td><td align=center><b>S / L</b></td><td align=center><b>T / P</b></td><td align=center><b>Time</b></td><td align=center><b>Price</b></td><td align=center><b>Commission</b></td><td align=center><b>Swap</b></td><td align=center><b>Profit</b></td></tr>
<tr bgcolor="#FFFFFF" align=right><td>2026.10.30 09:15:02</td><td>10001</td><td>EURUSD</td><td>buy</td><td>0.50</td><td>1.08500</td><td>1.08300</td><td>1.08900</td><td>2026.10.30 11:40:10</td><td>1.08800</td><td>-3.50</td><td>-0.20</td><td>1&nbsp;150.00</td></tr>
<tr bgcolor="#F7F7F7" align=right><td>2026.10.29 17:05:00</td><td>10002</td><td>GBPUSD.m</td><td>sell</td><td>1.00</td><td>1.27000</td><td>1.27200</td><td>1.26500</td><td>2026.10.29 19:00:00</td><td>1.27150</td><td>-7.00</td><td>0.00</td><td>-150.00</td></tr>
<tr><th colspan=13>Orders</th></tr>
<tr><td>Open Time</td><td>Order</td><td>Symbol</td><td>Type</td><td>Volume</td><td>Price</td><td>S / L</td><td>T / P</td><td>Time</td><td>State</td><td>Comment</td></tr>
<tr><td>2026.10.30 09:15:02</td><td>20001</td><td>EURUSD</td><td>buy</td><td>0.50</td><td>1.085</td><td></td><td></td><td>2026.10.30 09:15:02</td><td>filled</td><td></td></tr>
<tr><th colspan=14>Deals</th></tr>
<tr><td>Time</td><td>Deal</td><td>Symbol</td><td>Type</td><td>Direction</td><td>Volume</td><td>Price</td><td>Order</td><td>Commission</td><td>Fee</td><td>Swap</td><td>Profit</td><td>Balance</td></tr>
<tr><td>2026.10.30 11:40:10</td><td>3</td><td>EURUSD</td><td>sell</td><td>out</td><td>0.50</td><td>1.088</td><td>4</td><td>0</td><td>0</td><td>0</td><td>9999</td><td>0</td></tr>
</table></body></html>`;

describe("htmlToRows", () => {
  it("reads cells from rows, decoding entities and dropping empty rows", () => {
    const rows = htmlToRows("<table><tr><td>a&nbsp;b</td><td><b>1&amp;2</b></td></tr><tr><td> </td></tr><tr><th>x</th></tr></table>");
    expect(rows).toEqual([["a b", "1&2"], ["x"]]);
  });

  it("ignores scripts, styles and comments", () => {
    const rows = htmlToRows("<style>td{}</style><!-- <tr><td>no</td></tr> --><script>var a='<tr><td>no</td></tr>'</script><tr><td>yes</td></tr>");
    expect(rows).toEqual([["yes"]]);
  });

  it("copes with cells that are never closed", () => {
    expect(htmlToRows("<tr><td>a<td>b<td>c</tr>")).toEqual([["a", "b", "c"]]);
  });
});

describe("parseBrokerStatement: MT4 detailed statement", () => {
  const result = parseBrokerStatement(MT4_STATEMENT, OPTS);

  it("reads closed transactions only", () => {
    expect(result.layout).toBe("positions");
    expect(result.fileError).toBeNull();
    const trades = result.rows.map((r) => r.trade!);
    expect(trades).toHaveLength(2);
    expect(trades[0]).toMatchObject({
      pair: "XAUUSD",
      direction: "short",
      date: "2026-10-20",
      pnl: 1198.5, 
      session: "Asian", 
    });
  });

  it("ignores balance lines, pending orders and the totals row", () => {
    expect(result.rows.every((r) => r.error === null)).toBe(true);
    expect(result.ignoredCount).toBeGreaterThanOrEqual(3);
  });

  it("stops before open trades", () => {
    expect(result.rows.some((r) => r.trade?.pnl === 999)).toBe(false);
  });
});

describe("parseBrokerStatement: MT5 trade history report", () => {
  const result = parseBrokerStatement(MT5_REPORT, OPTS);

  it("reads the Positions table and stops at Orders", () => {
    expect(result.layout).toBe("positions");
    const trades = result.rows.map((r) => r.trade!);
    expect(trades).toHaveLength(2);
    expect(trades[0]).toMatchObject({ pair: "EURUSD", direction: "long", pnl: 1146.3 });
    expect(trades[1]).toMatchObject({ pair: "GBPUSD", direction: "short", pnl: -157 });
    expect(trades.some((t) => t.pnl === 9999)).toBe(false);
  });
});

describe("parseBrokerStatement: CSV still works", () => {
  it("falls back to the CSV reader for plain text", () => {
    const csv = "Ticket,Open Time,Type,Size,Item,Price,Close Time,Price,Commission,Swap,Profit\n1,2026.10.20 08:00:00,buy,0.1,EURUSD,1.1,2026.10.20 09:00:00,1.2,0,0,10";
    expect(looksLikeHtml(csv)).toBe(false);
    expect(parseBrokerStatement(csv, OPTS).rows[0]?.trade?.pnl).toBe(10);
  });

  it("says so when an HTML page holds no trade table", () => {
    const result = parseBrokerStatement("<html><body><table><tr><td>hello</td></tr></table></body></html>", OPTS);
    expect(result.fileError).toMatch(/MT4 or MT5/);
  });
});

describe("decodeStatementFile", () => {
  const encodeUtf16le = (text: string, withBom: boolean): ArrayBuffer => {
    const units = new Uint16Array(text.length + (withBom ? 1 : 0));
    if (withBom) units[0] = 0xfeff;
    for (let i = 0; i < text.length; i++) units[i + (withBom ? 1 : 0)] = text.charCodeAt(i);
    return units.buffer;
  };

  it("reads UTF-16 with a byte-order mark", () => {
    expect(decodeStatementFile(encodeUtf16le("<table><tr><td>é</td></tr></table>", true))).toBe("<table><tr><td>é</td></tr></table>");
  });

  it("reads UTF-16 without a byte-order mark", () => {
    const text = "<table><tr><td>Profit</td></tr></table>";
    expect(decodeStatementFile(encodeUtf16le(text, false))).toBe(text);
  });

  it("reads UTF-8", () => {
    const buffer = new TextEncoder().encode("<tr><td>€</td></tr>").buffer as ArrayBuffer;
    expect(decodeStatementFile(buffer)).toBe("<tr><td>€</td></tr>");
  });

  it("parses a whole UTF-16 MT5 report end to end", () => {
    const text = decodeStatementFile(encodeUtf16le(MT5_REPORT, true));
    expect(parseBrokerStatement(text, OPTS).rows.filter((r) => r.trade)).toHaveLength(2);
  });
});