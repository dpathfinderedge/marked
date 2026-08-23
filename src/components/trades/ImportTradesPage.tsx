import { useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { useTrades } from "@/hooks/useTrades";
import { Button } from "@/components/ui/Button";
import { parseTradesCsv, type CsvImportRow } from "@/lib/csv/parseTradesCsv";
import { downloadCsvTemplate } from "@/lib/csv/csvTemplate";
import type { NewTradeInput } from "@/utils/tradeMappers";

function isValidRow(
  row: CsvImportRow,
): row is CsvImportRow & { trade: NewTradeInput } {
  return row.trade !== null;
}

export function ImportTradesPage(): JSX.Element {
  const { addTrades } = useTrades();
  const [rows, setRows] = useState<CsvImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportedCount(null);
    setImportError(null);

    const text = await file.text();
    const result = parseTradesCsv(text);
    setRows(result.rows);
  };

  const validRows = rows.filter(isValidRow);
  const errorCount = rows.length - validRows.length;

  const handleImport = async (): Promise<void> => {
    setIsImporting(true);
    setImportError(null);

    const { error, count } = await addTrades(validRows.map((r) => r.trade));

    setIsImporting(false);

    if (error) {
      setImportError(error);
      return;
    }

    setImportedCount(count);
    setRows([]);
    setFileName(null);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl italic text-ink">
          Import trades
        </h1>
        <Link
          to="/trades"
          className="font-mono text-xs uppercase tracking-wider text-muted underline underline-offset-4"
        >
          Back to trades
        </Link>
      </div>

      <div className="rounded-xl border border-rule bg-surface p-6">
        <p className="font-sans text-sm text-muted">
          Import trades from a CSV file. Not sure of the format?{" "}
          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="text-ink underline underline-offset-4"
          >
            Download the template
          </button>{" "}
          — P&L is calculated the same way as manual entry, including the
          cross-pair fallback (add a <code>manualPnl</code> value for those
          rows).
        </p>

        <div className="mt-4">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => void handleFileChange(e)}
            className="font-sans text-sm text-ink file:mr-4 file:rounded-lg file:border file:border-rule file:bg-paper file:px-3 file:py-2 file:font-sans file:text-sm file:text-ink"
          />
        </div>

        {importedCount !== null ? (
          <p className="mt-4 font-mono text-xs text-green">
            Imported {importedCount} trade{importedCount === 1 ? "" : "s"}.
          </p>
        ) : null}
        {importError ? (
          <p className="mt-4 font-mono text-xs text-stamp">{importError}</p>
        ) : null}
      </div>

      {fileName && rows.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-xs text-muted">
              {fileName} · {validRows.length} valid · {errorCount} error
              {errorCount === 1 ? "" : "s"}
            </p>
            <Button
              onClick={() => void handleImport()}
              isLoading={isImporting}
              disabled={validRows.length === 0}
            >
              Import {validRows.length} trade
              {validRows.length === 1 ? "" : "s"}
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-rule bg-surface">
            {rows.map((row) => (
              <div
                key={row.rowNumber}
                className="flex items-center justify-between border-b border-rule px-4 py-2.5 font-mono text-xs last:border-b-0"
              >
                <span className="text-muted">Row {row.rowNumber}</span>
                {row.trade ? (
                  <span className="flex items-center gap-3">
                    <span className="text-ink">
                      {row.trade.pair} · {row.trade.date}
                    </span>
                    <span
                      className={
                        row.trade.pnl >= 0 ? "text-green" : "text-stamp"
                      }
                    >
                      {row.trade.pnl >= 0 ? "+" : "−"}
                      {Math.abs(row.trade.pnl).toFixed(2)}
                    </span>
                  </span>
                ) : (
                  <span className="text-stamp">{row.error}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}