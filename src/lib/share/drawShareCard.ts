import type { ShareCardData } from "@/lib/calculations";
import { formatSignedDollars } from "@/utils/format";

export const SHARE_CARD_WIDTH = 1200;
export const SHARE_CARD_HEIGHT = 630;

const COLOR = {
  bg: "rgb(10, 10, 12)",
  line: "rgb(39, 39, 44)",
  text: "rgb(242, 242, 240)",
  muted: "rgb(140, 140, 147)",
  faint: "rgb(92, 92, 100)",
  red: "rgb(226, 88, 75)",
  green: "rgb(63, 174, 114)",
};

const SANS = '"Geist", system-ui, -apple-system, "Segoe UI", sans-serif';
const MONO = '"Geist Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

const PAD = 64;
const LEFT_WIDTH = 500;

function formatHero(hero: ShareCardData["hero"]): { label: string; value: string } {
  if (hero.kind === "pnl") return { label: "Net P&L", value: formatSignedDollars(hero.value, 0) };
  if (hero.kind === "totalR") {
    const sign = hero.value >= 0 ? "+" : "−";
    return { label: "Total R", value: `${sign}${Math.abs(hero.value).toFixed(1)}R` };
  }
  return { label: "Win rate", value: `${Math.round(hero.value * 100)}%` };
}

function heroColor(hero: ShareCardData["hero"]): string {
  if (hero.kind === "winRate") return COLOR.text;
  return hero.value >= 0 ? COLOR.green : COLOR.red;
}

function percent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function ratio(value: number | null): string {
  return value === null ? "—" : value.toFixed(2);
}

function stats(data: ShareCardData): { label: string; value: string }[] {
  return [
    data.hero.kind === "winRate"
      ? { label: "Wins and losses", value: `${data.wins} · ${data.losses}` }
      : { label: "Win rate", value: percent(data.winRate) },
    { label: "Profit factor", value: ratio(data.profitFactor) },
    { label: "Average R", value: data.averageR === null ? "—" : ratio(data.averageR) },
    { label: "Trades", value: String(data.trades) },
  ];
}

function fitFont(ctx: CanvasRenderingContext2D, text: string, family: string, weight: number, start: number, maxWidth: number): number {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 40 && ctx.measureText(text).width > maxWidth) {
    size -= 4;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function drawBrand(ctx: CanvasRenderingContext2D): void {
  const cx = PAD + 16;
  const cy = PAD + 16;
  ctx.strokeStyle = COLOR.red;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy + 1);
  ctx.lineTo(cx - 1.5, cy + 6);
  ctx.lineTo(cx + 7, cy - 5);
  ctx.stroke();

  ctx.fillStyle = COLOR.text;
  ctx.font = `600 28px ${SANS}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Marked", PAD + 44, cy + 1);
}

function drawCurve(ctx: CanvasRenderingContext2D, data: ShareCardData): void {
  const x0 = PAD + LEFT_WIDTH + 70;
  const x1 = SHARE_CARD_WIDTH - PAD;
  const y0 = 170;
  const y1 = 470;
  const values = data.curve;
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;
  const xAt = (i: number): number => x0 + (i / Math.max(1, values.length - 1)) * (x1 - x0);
  const yAt = (v: number): number => y1 - ((v - min) / span) * (y1 - y0);
  const end = values[values.length - 1] ?? 0;
  const color = end >= 0 ? COLOR.green : COLOR.red;

  ctx.strokeStyle = COLOR.line;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 8]);
  ctx.beginPath();
  ctx.moveTo(x0, yAt(0));
  ctx.lineTo(x1, yAt(0));
  ctx.stroke();
  ctx.setLineDash([]);

  const gradient = ctx.createLinearGradient(0, y0, 0, y1);
  gradient.addColorStop(0, end >= 0 ? "rgba(63, 174, 114, 0.28)" : "rgba(226, 88, 75, 0.28)");
  gradient.addColorStop(1, "rgba(10, 10, 12, 0)");
  ctx.beginPath();
  ctx.moveTo(xAt(0), y1);
  values.forEach((v, i) => ctx.lineTo(xAt(i), yAt(v)));
  ctx.lineTo(xAt(values.length - 1), y1);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  values.forEach((v, i) => (i === 0 ? ctx.moveTo(xAt(i), yAt(v)) : ctx.lineTo(xAt(i), yAt(v))));
  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(xAt(values.length - 1), yAt(end), 7, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = COLOR.bg;
  ctx.stroke();

  ctx.fillStyle = COLOR.faint;
  ctx.font = `500 20px ${SANS}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(data.showDollars ? "Equity curve" : "Equity curve, shape only", x0, y1 + 40);
}

export function drawShareCard(ctx: CanvasRenderingContext2D, data: ShareCardData): void {
  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT);

  drawBrand(ctx);

  ctx.fillStyle = COLOR.muted;
  ctx.font = `500 24px ${SANS}`;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(data.periodLabel, SHARE_CARD_WIDTH - PAD, PAD + 17);

  const hero = formatHero(data.hero);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = COLOR.muted;
  ctx.font = `500 24px ${SANS}`;
  ctx.fillText(hero.label, PAD, 190);

  const heroSize = fitFont(ctx, hero.value, MONO, 700, 108, LEFT_WIDTH);
  ctx.fillStyle = heroColor(data.hero);
  ctx.font = `700 ${heroSize}px ${MONO}`;
  ctx.fillText(hero.value, PAD, 190 + 20 + heroSize * 0.8);

  const cells = stats(data);
  const gridTop = 372;
  cells.forEach((cell, i) => {
    const x = PAD + (i % 2) * 250;
    const y = gridTop + Math.floor(i / 2) * 96;
    ctx.fillStyle = COLOR.faint;
    ctx.font = `500 19px ${SANS}`;
    ctx.fillText(cell.label, x, y);
    ctx.fillStyle = COLOR.text;
    ctx.font = `600 40px ${MONO}`;
    ctx.fillText(cell.value, x, y + 46);
  });

  drawCurve(ctx, data);

  ctx.fillStyle = COLOR.faint;
  ctx.font = `500 20px ${SANS}`;
  ctx.textAlign = "left";
  ctx.fillText("Journaled with Marked", PAD, SHARE_CARD_HEIGHT - 40);
}