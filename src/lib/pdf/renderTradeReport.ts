import { jsPDF } from "jspdf";
import { pdfCompactMoney, pdfSafe, type ReportModel, type Tone } from "@/lib/pdf/tradeReport";
import { formatLongDate } from "@/utils/dates";


const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const FOOTER_Y = PAGE_H - 9;
const BOTTOM_LIMIT = PAGE_H - 16;
const ROW_H = 6.4;

type Rgb = [number, number, number];
const INK: Rgb = [19, 19, 22];
const MUTED: Rgb = [110, 110, 118];
const RULE: Rgb = [228, 228, 231];
const RED: Rgb = [193, 55, 42];
const GREEN: Rgb = [31, 122, 77];

const toneColor = (tone: Tone): Rgb => (tone === "good" ? GREEN : tone === "bad" ? RED : INK);

function fit(doc: jsPDF, text: string, width: number): string {
  if (doc.getTextWidth(text) <= width) return text;
  let out = text;
  while (out.length > 1 && doc.getTextWidth(`${out}...`) > width) out = out.slice(0, -1);
  return `${out}...`;
}

function drawHeader(doc: jsPDF, model: ReportModel): number {
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...RED);
  doc.text("Marked", MARGIN, 18);
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED);
  doc.text(`Generated ${formatLongDate(model.generatedOn)}`, PAGE_W - MARGIN, 18, { align: "right" });

  doc.setFont("helvetica", "bold").setFontSize(22).setTextColor(...INK);
  doc.text(model.title, MARGIN, 31);

  let y = 38;
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...MUTED);
  doc.text(model.period, MARGIN, y);

  if (model.filters.length > 0) {
    y += 5.5;
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(`Filtered: ${model.filters.join("   |   ")}`, CONTENT_W) as string[];
    doc.text(lines, MARGIN, y);
    y += (lines.length - 1) * 4;
  }
  return y + 8;
}

function drawStats(doc: jsPDF, model: ReportModel, top: number): number {
  const gap = 4;
  const w = (CONTENT_W - gap * 3) / 4;
  const h = 17;
  model.stats.forEach((stat, i) => {
    const x = MARGIN + (i % 4) * (w + gap);
    const y = top + Math.floor(i / 4) * (h + gap);
    doc.setDrawColor(...RULE).setLineWidth(0.3).roundedRect(x, y, w, h, 1.8, 1.8, "S");
    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...MUTED);
    doc.text(stat.label, x + 3.5, y + 5.6);
    doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(...toneColor(stat.tone));
    doc.text(fit(doc, stat.value, w - 7), x + 3.5, y + 13);
  });
  const rows = Math.ceil(model.stats.length / 4);
  return top + rows * (h + gap) + 2;
}

function drawEquity(doc: jsPDF, model: ReportModel, top: number): number {
  if (model.equity.length < 2) return top;
  const h = 40;
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...INK);
  doc.text("Cumulative P&L", MARGIN, top + 3);
  const boxY = top + 6;
  doc.setDrawColor(...RULE).setLineWidth(0.3).roundedRect(MARGIN, boxY, CONTENT_W, h, 1.8, 1.8, "S");

  const padL = 18;
  const padR = 5;
  const padY = 5;
  const left = MARGIN + padL;
  const width = CONTENT_W - padL - padR;
  const min = Math.min(0, ...model.equity);
  const max = Math.max(0, ...model.equity);
  const span = max - min || 1;
  const yOf = (v: number): number => boxY + padY + (1 - (v - min) / span) * (h - padY * 2);

  doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(...MUTED);
  doc.text(pdfCompactMoney(max), left - 2, yOf(max) + 1, { align: "right" });
  if (min < 0) doc.text(pdfCompactMoney(min), left - 2, yOf(min) + 1, { align: "right" });
  const zeroY = yOf(0);
  const crowded = [yOf(max), yOf(min)].some((other) => other !== zeroY && Math.abs(other - zeroY) < 3.5);
  if (!crowded) doc.text("$0", left - 2, zeroY + 1, { align: "right" });

  doc.setDrawColor(...RULE).setLineWidth(0.25).setLineDashPattern([1, 1], 0);
  doc.line(left, yOf(0), left + width, yOf(0));
  doc.setLineDashPattern([], 0);

  doc.setDrawColor(...GREEN).setLineWidth(0.5);
  const step = width / (model.equity.length - 1);
  for (let i = 1; i < model.equity.length; i++) {
    doc.line(
      left + (i - 1) * step,
      yOf(model.equity[i - 1]!),
      left + i * step,
      yOf(model.equity[i]!),
    );
  }
  return boxY + h + 8;
}

function drawTableHeader(doc: jsPDF, model: ReportModel, y: number, colX: number[], colW: number[]): number {
  doc.setFont("helvetica", "bold").setFontSize(8).setTextColor(...MUTED);
  model.columns.forEach((col, i) => {
    const x = col.align === "right" ? colX[i]! + colW[i]! : colX[i]!;
    doc.text(col.label, x, y, { align: col.align });
  });
  doc.setDrawColor(...INK).setLineWidth(0.3).line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2);
  return y + 2 + ROW_H - 1.4;
}

function drawTable(doc: jsPDF, model: ReportModel, top: number): void {
  const totalWeight = model.columns.reduce((sum, c) => sum + c.weight, 0);
  const colW = model.columns.map((c) => (c.weight / totalWeight) * CONTENT_W);
  const colX = colW.map((_, i) => MARGIN + colW.slice(0, i).reduce((a, b) => a + b, 0));
  const pad = 1.5;
  const textW = colW.map((w, i) => w - (i === colW.length - 1 ? 0 : pad * 2));

  if (model.rows.length === 0) {
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(...MUTED);
    doc.text("No trades to show.", MARGIN, top);
    return;
  }

  let y = drawTableHeader(doc, model, top, colX, colW);
  for (const row of model.rows) {
    if (y > BOTTOM_LIMIT) {
      doc.addPage();
      y = drawTableHeader(doc, model, MARGIN + 6, colX, colW);
    }
    row.cells.forEach((cell, i) => {
      const col = model.columns[i]!;
      const isPair = i === 1;
      const isPnl = i === model.columns.length - 1;
      doc.setFont("helvetica", isPair || isPnl ? "bold" : "normal").setFontSize(8.5);
      doc.setTextColor(...(isPnl ? toneColor(row.tone) : INK));
      const text = fit(doc, cell, textW[i]!);
      if (col.align === "right") doc.text(text, colX[i]! + colW[i]!, y, { align: "right" });
      else doc.text(text, colX[i]!, y);
    });
    doc.setDrawColor(...RULE).setLineWidth(0.15).line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2);
    y += ROW_H;
  }
}

function drawFooters(doc: jsPDF): void {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(...MUTED);
    doc.text("Journaled with Marked", MARGIN, FOOTER_Y);
    doc.text(`Page ${page} of ${pages}`, PAGE_W - MARGIN, FOOTER_Y, { align: "right" });
  }
}

export function renderTradeReport(model: ReportModel): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  doc.setProperties({ title: pdfSafe(`Marked - ${model.title}`), creator: "Marked" });

  let y = drawHeader(doc, model);
  y = drawStats(doc, model, y);
  y = drawEquity(doc, model, y + 2);
  drawTable(doc, model, y + 2);
  drawFooters(doc);
  return doc;
}