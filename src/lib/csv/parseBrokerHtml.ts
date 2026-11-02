import type { BrokerParseOptions, BrokerParseResult } from "@/lib/csv/parseBrokerCsv";
import { parseBrokerCsv, parseBrokerRows } from "@/lib/csv/parseBrokerCsv";

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  minus: "\u2212",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1]?.toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

function cellText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

export function htmlToRows(html: string): string[][] {
  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "");
  const rows: string[][] = [];
  for (const chunk of cleaned.split(/<tr[\s>]/i).slice(1)) {
    const body = chunk.split(/<\/tr>/i)[0] ?? "";
    const cells = body
      .split(/<t[dh](?:\s[^>]*)?>/i)
      .slice(1)
      .map(cellText);
    if (cells.some((cell) => cell !== "")) rows.push(cells);
  }
  return rows;
}

export function looksLikeHtml(text: string): boolean {
  return /<t[dr](?:\s|>)/i.test(text.slice(0, 200_000));
}

export function decodeStatementFile(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const b0 = bytes[0];
  const b1 = bytes[1];
  if (b0 === 0xff && b1 === 0xfe) return new TextDecoder("utf-16le").decode(bytes.subarray(2));
  if (b0 === 0xfe && b1 === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
  const sample = bytes.subarray(0, Math.min(bytes.length, 200));
  let zerosOdd = 0;
  let zerosEven = 0;
  sample.forEach((byte, i) => {
    if (byte !== 0) return;
    if (i % 2) zerosOdd++;
    else zerosEven++;
  });
  if (sample.length >= 8 && zerosOdd > sample.length / 4) return new TextDecoder("utf-16le").decode(bytes);
  if (sample.length >= 8 && zerosEven > sample.length / 4) return new TextDecoder("utf-16be").decode(bytes);
  return new TextDecoder("utf-8").decode(bytes);
}

export function parseBrokerStatement(text: string, options: BrokerParseOptions): BrokerParseResult {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  return looksLikeHtml(clean) ? parseBrokerRows(htmlToRows(clean), options) : parseBrokerCsv(clean, options);
}