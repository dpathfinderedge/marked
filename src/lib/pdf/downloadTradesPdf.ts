import type { Trade } from "@/types/trade";
import { buildTradeReport, tradesPdfFilename } from "@/lib/pdf/tradeReport";

export async function downloadTradesPdf(
  trades: Trade[],
  options: { filters: string[]; today: string },
): Promise<void> {
  const { renderTradeReport } = await import("@/lib/pdf/renderTradeReport");
  const model = buildTradeReport(trades, { filters: options.filters, generatedOn: options.today });
  renderTradeReport(model).save(tradesPdfFilename(options.today));
}