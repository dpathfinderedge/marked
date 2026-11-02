import { useMemo, useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { useTrades } from "@/hooks/useTrades";
import { useToast } from "@/hooks/useToast";
import { useSubscription } from "@/hooks/useSubscription";
import { PageHeader } from "@/components/ui/PageHeader";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  parseTradesCsv,
  resolveCrossPairRates,
  type CsvImportRow,
} from "@/lib/csv/parseTradesCsv";
import { findDuplicateRows, parseBrokerCsv } from "@/lib/csv/parseBrokerCsv";
import { downloadCsvTemplate } from "@/lib/csv/csvTemplate";
import type { NewTradeInput } from "@/utils/tradeMappers";

type Source = "marked" | "broker";

const OFFSET_OPTIONS = [
  { value: "0", label: "UTC+0" },
  { value: "1", label: "UTC+1" },
  { value: "2", label: "UTC+2 (most brokers, winter)" },
  { value: "3", label: "UTC+3 (most brokers, summer)" },
  { value: "4", label: "UTC+4" },
  { value: "-5", label: "UTC-5" },
];

function isValidRow(
  row: CsvImportRow,
): row is CsvImportRow & { trade: NewTradeInput } {
  return row.trade !== null;
}

function SectionLabel({ children }: { children: string }): JSX.Element {
  return (
    <p className="text-xs font-medium uppercase tracking-widest text-text-faint">
      {children}
    </p>
  );
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function ImportTradesPage(): JSX.Element {
  const { addTrades, trades: existingTrades } = useTrades();
  const { showToast } = useToast();
  const { isPro } = useSubscription();
  const [source, setSource] = useState<Source>("marked");
  const [rows, setRows] = useState<CsvImportRow[]>([]);
  const [fileText, setFileText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [utcOffset, setUtcOffset] = useState("2");
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isLookingUpRates, setIsLookingUpRates] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const brokerResult = useMemo(
    () =>
      source === "broker" && fileText !== null
        ? parseBrokerCsv(fileText, { utcOffsetHours: Number(utcOffset) })
        : null,
    [source, fileText, utcOffset],
  );

  const displayRows = brokerResult ? brokerResult.rows : rows;
  const duplicateRows = useMemo(
    () =>
      brokerResult ? findDuplicateRows(brokerResult.rows, existingTrades) : new Set<number>(),
    [brokerResult, existingTrades],
  );

  const parsedRows = displayRows.filter(isValidRow);
  const errorCount = displayRows.length - parsedRows.length;
  const duplicateCount = parsedRows.filter((r) => duplicateRows.has(r.rowNumber)).length;
  const validRows = skipDuplicates
    ? parsedRows.filter((r) => !duplicateRows.has(r.rowNumber))
    : parsedRows;
  const pendingCrossPairCount = rows.filter((r) => r.pendingCrossPair).length;

  const resetFile = (): void => {
    setRows([]);
    setFileText(null);
    setFileName(null);
    setImportError(null);
    setImportedCount(null);
  };

  const handleSourceChange = (next: Source): void => {
    if (next === source) return;
    resetFile();
    setSource(next);
  };

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportedCount(null);
    setImportError(null);

    const text = await file.text();
    if (source === "broker") {
      setFileText(text);
    } else {
      setRows(parseTradesCsv(text).rows);
    }
  };

  const handleLookupRates = async (): Promise<void> => {
    setIsLookingUpRates(true);
    const updatedRows = await resolveCrossPairRates(rows);
    setIsLookingUpRates(false);
    setRows(updatedRows);

    const stillPending = updatedRows.filter(
      (r) => r.pendingCrossPair && r.error,
    ).length;
    const resolved = pendingCrossPairCount - stillPending;

    if (resolved > 0) {
      showToast(
        `Priced ${resolved} cross-pair row${resolved === 1 ? "" : "s"} via live rates.`,
      );
    }
    if (stillPending > 0) {
      showToast(
        `Couldn't fetch a rate for ${stillPending} row${stillPending === 1 ? "" : "s"}.`,
        "error",
      );
    }
  };

  const handleImport = async (): Promise<void> => {
    setIsImporting(true);
    setImportError(null);

    const { error, count } = await addTrades(validRows.map((r) => r.trade));

    setIsImporting(false);

    if (error) {
      setImportError(error);
      showToast(error, "error");
      return;
    }

    setImportedCount(count);
    const skipped =
      skipDuplicates && duplicateCount > 0
        ? ` Skipped ${plural(duplicateCount, "duplicate")}.`
        : "";
    showToast(`Imported ${plural(count, "trade")}.${skipped}`);
    resetFile();
  };

  const sourceButton = (value: Source, label: string): JSX.Element => (
    <button
      type="button"
      aria-pressed={source === value}
      onClick={() => handleSourceChange(value)}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        source === value
          ? "bg-bg-1 text-text shadow-sm"
          : "text-text-muted hover:text-text"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <PageHeader
        title="Import trades"
        description="Bring in trades from a CSV file."
        actions={
          <Link
            to="/trades"
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-text-muted transition-colors hover:bg-bg-2 hover:text-text"
          >
            Back to trades
          </Link>
        }
      />

      {!isPro ? (
        <UpgradePrompt feature="CSV import" />
      ) : (
        <>
          <div className="inline-flex self-start rounded-lg bg-bg-2 p-1">
            {sourceButton("marked", "Marked CSV")}
            {sourceButton("broker", "MT4 / MT5 history")}
          </div>

          <div className="rounded-xl border border-line bg-bg-1 p-6">
            {source === "marked" ? (
              <p className="font-sans text-sm text-text-muted">
                Import trades from a CSV file. Not sure of the format?{" "}
                <button
                  type="button"
                  onClick={downloadCsvTemplate}
                  className="text-text underline underline-offset-4"
                >
                  Download the template
                </button>{" "}
                — P&L is calculated the same way as manual entry, including a live
                rate lookup for cross pairs (or add a <code>manualPnl</code> value
                yourself).
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <p className="font-sans text-sm text-text-muted">
                  Import closed trades from a MetaTrader history saved as CSV. In MT5,
                  open the History tab, right-click and choose Report, then save it as
                  CSV (Positions or Deals both work). In MT4, use the same menu on the
                  Account History tab. P&L is the broker&apos;s own profit plus
                  commission, fees and swap. Setups and risk aren&apos;t in the file, so
                  you can add them to each trade afterwards.
                </p>
                <div className="max-w-xs">
                  <Select
                    label="Broker server time"
                    value={utcOffset}
                    onChange={(e) => setUtcOffset(e.target.value)}
                    options={OFFSET_OPTIONS}
                  />
                  <p className="mt-1.5 text-xs text-text-faint">
                    Only used to label each trade&apos;s session (Asian, London, Overlap
                    or New York). Dates stay as your broker shows them.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-4">
              <input
                key={source}
                type="file"
                accept={source === "broker" ? ".csv,.tsv,.txt" : ".csv"}
                onChange={(e) => void handleFileChange(e)}
                className="font-sans text-sm text-text file:mr-4 file:rounded-lg file:border file:border-line file:bg-bg-0 file:px-3 file:py-2 file:font-sans file:text-sm file:text-text"
              />
            </div>

            {importedCount !== null ? (
              <p className="mt-4 font-mono text-xs text-signal-green">
                Imported {plural(importedCount, "trade")}.
              </p>
            ) : null}
            {importError ? (
              <p className="mt-4 font-mono text-xs text-signal-red">{importError}</p>
            ) : null}
            {brokerResult?.fileError ? (
              <p className="mt-4 font-mono text-xs text-signal-red">
                {brokerResult.fileError}
              </p>
            ) : null}
          </div>

          {fileName && displayRows.length > 0 ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <SectionLabel>
                  {`${fileName} · ${validRows.length} to import · ${plural(errorCount, "error")}`}
                </SectionLabel>
                <Button
                  onClick={() => void handleImport()}
                  isLoading={isImporting}
                  disabled={validRows.length === 0}
                  className="self-start sm:self-auto"
                >
                  Import {plural(validRows.length, "trade")}
                </Button>
              </div>

              {brokerResult ? (
                <div className="flex flex-col gap-1.5 text-xs text-text-muted">
                  {brokerResult.ignoredCount > 0 ? (
                    <p>
                      Ignored {plural(brokerResult.ignoredCount, "row")} that
                      {brokerResult.ignoredCount === 1 ? " isn't" : " aren't"} closed
                      trades (deposits, balance lines
                      {brokerResult.layout === "deals" ? ", entry fills" : ""}).
                    </p>
                  ) : null}
                  {brokerResult.layout === "deals" ? (
                    <p>
                      Deals file: commission charged when a trade opened isn&apos;t
                      included in its P&L. Use the Positions report for exact net P&L.
                    </p>
                  ) : null}
                  {duplicateCount > 0 ? (
                    <label className="flex items-center gap-2 text-text">
                      <input
                        type="checkbox"
                        checked={skipDuplicates}
                        onChange={(e) => setSkipDuplicates(e.target.checked)}
                      />
                      Skip {plural(duplicateCount, "trade")} already in your journal
                    </label>
                  ) : null}
                </div>
              ) : null}

              {source === "marked" && pendingCrossPairCount > 0 ? (
                <button
                  type="button"
                  onClick={() => void handleLookupRates()}
                  disabled={isLookingUpRates}
                  className="self-start text-xs font-medium text-text-muted underline underline-offset-4 transition-colors hover:text-text disabled:opacity-50"
                >
                  {isLookingUpRates
                    ? "Looking up rates…"
                    : `Look up live rates for ${pendingCrossPairCount} cross-pair row${pendingCrossPairCount === 1 ? "" : "s"}`}
                </button>
              ) : null}

              <div className="overflow-hidden rounded-xl border border-line bg-bg-1">
                {displayRows.map((row) => {
                  const isDuplicate = duplicateRows.has(row.rowNumber);
                  const willSkip = isDuplicate && skipDuplicates;
                  return (
                    <div
                      key={row.rowNumber}
                      className={`flex items-center justify-between border-b border-line px-4 py-2.5 font-mono text-xs last:border-b-0 ${
                        willSkip ? "opacity-60" : ""
                      }`}
                    >
                      <span className="text-text-muted">Row {row.rowNumber}</span>
                      {row.trade ? (
                        <span className="flex items-center gap-3">
                          {isDuplicate ? (
                            <span className="rounded bg-bg-2 px-1.5 py-0.5 text-[11px] text-text-muted">
                              {willSkip ? "Already logged · skipped" : "Already logged"}
                            </span>
                          ) : null}
                          <span className="text-text">
                            {row.trade.pair} · {row.trade.date}
                          </span>
                          <span
                            className={
                              row.trade.pnl >= 0 ? "text-signal-green" : "text-signal-red"
                            }
                          >
                            {row.trade.pnl >= 0 ? "+" : "−"}
                            {Math.abs(row.trade.pnl).toFixed(2)}
                          </span>
                        </span>
                      ) : (
                        <span className="text-signal-red">{row.error}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}