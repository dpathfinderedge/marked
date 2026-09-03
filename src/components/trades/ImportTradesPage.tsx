import { useState, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { useTrades } from "@/hooks/useTrades";
import { useToast } from "@/hooks/useToast";
import { Button } from "@/components/ui/Button";
import { parseTradesCsv, type CsvImportRow } from "@/lib/csv/parseTradesCsv";
import { downloadCsvTemplate } from "@/lib/csv/csvTemplate";
import type { NewTradeInput } from "@/utils/tradeMappers";

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

export function ImportTradesPage(): JSX.Element {
  const { addTrades } = useTrades();
  const { showToast } = useToast();
  const [rows, setRows] = useState<CsvImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const text = await file.text();
    const result = parseTradesCsv(text);
    setRows(result.rows);
  };

  const validRows = rows.filter(isValidRow);
  const errorCount = rows.length - validRows.length;

  const handleImport = async (): Promise<void> => {
    setIsImporting(true);

    const { error, count } = await addTrades(validRows.map((r) => r.trade));

    setIsImporting(false);

    if (error) {
      showToast(error, "error");
      return;
    }

    showToast(`Imported ${count} trade${count === 1 ? "" : "s"}.`);
    setRows([]);
    setFileName(null);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-text">
          Import trades
        </h1>
        <Link
          to="/trades"
          className="text-xs font-medium uppercase tracking-widest text-text-muted underline underline-offset-4 transition-colors hover:text-text"
        >
          Back to trades
        </Link>
      </div>

      <div className="rounded-xl border border-line bg-bg-1 p-6">
        <p className="font-sans text-sm text-text-muted">
          Import trades from a CSV file. Not sure of the format?{" "}
          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="text-text underline underline-offset-4"
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
            className="font-sans text-sm text-text file:mr-4 file:rounded-lg file:border file:border-line file:bg-bg-0 file:px-3 file:py-2 file:font-sans file:text-sm file:text-text"
          />
        </div>
      </div>

      {fileName && rows.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <SectionLabel>
              {`${fileName} · ${validRows.length} valid · ${errorCount} error${errorCount === 1 ? "" : "s"}`}
            </SectionLabel>
            <Button
              onClick={() => void handleImport()}
              isLoading={isImporting}
              disabled={validRows.length === 0}
            >
              Import {validRows.length} trade
              {validRows.length === 1 ? "" : "s"}
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border border-line bg-bg-1">
            {rows.map((row) => (
              <div
                key={row.rowNumber}
                className="flex items-center justify-between border-b border-line px-4 py-2.5 font-mono text-xs last:border-b-0"
              >
                <span className="text-text-muted">Row {row.rowNumber}</span>
                {row.trade ? (
                  <span className="flex items-center gap-3">
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
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}