import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FREE_TRADE_LIMIT, PERIOD_GRACE_MS } from "@/lib/calculations";

const sql = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20261024_server_side_enforcement.sql",
  ),
  "utf8",
);

describe("database enforcement matches the app", () => {
  it("uses the same monthly trade limit", () => {
    const match = sql.match(
      /function public\.free_trade_limit\(\)[\s\S]*?select\s+(\d+)/,
    );
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBe(FREE_TRADE_LIMIT);
  });

  it("uses the same grace period after a plan ends", () => {
    const graces = [...sql.matchAll(/interval '(\d+) hours'/g)].map((m) =>
      Number(m[1]),
    );
    expect(graces.length).toBeGreaterThan(0);
    for (const hours of graces) {
      expect(hours * 60 * 60 * 1000).toBe(PERIOD_GRACE_MS);
    }
  });

  it("counts months in UTC, like countTradesThisMonth", () => {
    expect(sql).toMatch(/date_trunc\('month', now\(\) at time zone 'utc'\)/);
  });

  it("raises the error text the app looks for", () => {
    expect(sql).toContain("FREE_TRADE_LIMIT_REACHED");
  });
});