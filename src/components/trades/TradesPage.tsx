import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { NotebookPen, Plus, Upload } from "lucide-react";
import { useTrades } from "@/hooks/useTrades";
import { useSettings } from "@/hooks/useSettings";
import { useAttachments } from "@/hooks/useAttachments";
import { useToast } from "@/hooks/useToast";
import { useSubscription } from "@/hooks/useSubscription";
import {
  DEFAULT_SORT,
  EMPTY_FILTERS,
  FREE_TRADE_LIMIT,
  calculateTotalPnl,
  calculateWinRate,
  countActiveFilters,
  countTradesThisMonth,
  defaultDirectionFor,
  detectConsecutiveLossFlags,
  filterTrades,
  paginate,
  sortTrades,
  type SortKey,
  type SortState,
  type TradeFilters,
} from "@/lib/calculations";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { UpgradePrompt } from "@/components/billing/UpgradePrompt";
import { TradeDrawer } from "@/components/trades/TradeDrawer";
import { TradeForm } from "@/components/trades/TradeForm";
import { TradesTable } from "@/components/trades/TradesTable";
import { TradesToolbar } from "@/components/trades/TradesToolbar";
import { isValidIsoDate } from "@/utils/dates";
import { formatSignedDollars } from "@/utils/format";
import type { NewTradeInput } from "@/utils/tradeMappers";

const PAGE_SIZES = [10, 25, 50];
const DEFAULT_PAGE_SIZE = 25;

export function TradesPage(): JSX.Element {
  const { trades, isLoading, error, addTrade, updateTrade, deleteTrade } = useTrades();
  const { threshold } = useSettings();
  const { uploadAttachments } = useAttachments();
  const { showToast } = useToast();
  const { isPro } = useSubscription();
  const [searchParams, setSearchParams] = useSearchParams();

  const [filters, setFilters] = useState<TradeFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isAddOpen = searchParams.has("new");
  const dateParam = searchParams.get("date");
  const addDate = dateParam && isValidIsoDate(dateParam) ? dateParam : undefined;

  const openAdd = (): void => setSearchParams({ new: "1" });
  const closeAdd = (): void => setSearchParams({}, { replace: true });

  const tradesThisMonth = countTradesThisMonth(trades);
  const isAtFreeLimit = !isPro && tradesThisMonth >= FREE_TRADE_LIMIT;

  const flaggedTradeIds = useMemo(
    () => detectConsecutiveLossFlags(trades, threshold),
    [trades, threshold],
  );

  const filtered = useMemo(() => filterTrades(trades, filters), [trades, filters]);
  const sorted = useMemo(() => sortTrades(filtered, sort), [filtered, sort]);
  const pageData = useMemo(() => paginate(sorted, page, pageSize), [sorted, page, pageSize]);

  const filteredPnl = useMemo(() => calculateTotalPnl(filtered), [filtered]);
  const filteredWinRate = useMemo(() => calculateWinRate(filtered), [filtered]);

  const selectedTrade = useMemo(
    () => trades.find((t) => t.id === selectedId) ?? null,
    [trades, selectedId],
  );

  const hasFilters = countActiveFilters(filters) > 0;

  const changeFilters = (patch: Partial<TradeFilters>): void => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const clearFilters = (): void => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const changeSort = (key: SortKey): void => {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: defaultDirectionFor(key) },
    );
    setPage(1);
  };

  const handleAddTrade = async (
    input: NewTradeInput,
    files: File[],
  ): Promise<{ error: string | null }> => {
    if (isAtFreeLimit) {
      const message = `You've hit the free plan's ${FREE_TRADE_LIMIT} trades/month limit.`;
      showToast(message, "error");
      return { error: message };
    }

    const { error: addError, trade } = await addTrade(input);

    if (addError || !trade) {
      const message = addError ?? "Something went wrong saving the trade.";
      showToast(message, "error");
      return { error: message };
    }

    if (files.length > 0) {
      const { error: uploadError } = await uploadAttachments(trade.id, files);
      if (uploadError) {
        const message = `Trade saved, but attachment upload failed: ${uploadError}`;
        showToast(message, "error");
        return { error: message };
      }
    }

    showToast("Trade logged.");
    return { error: null };
  };

  const description = isLoading
    ? undefined
    : `${trades.length} trade${trades.length === 1 ? "" : "s"} logged${
        isPro ? "" : ` · ${tradesThisMonth}/${FREE_TRADE_LIMIT} this month`
      }`;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        title="Trades"
        description={description}
        actions={
          <>
            <Link
              to="/trades/import"
              className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-bg-2 hover:text-text"
            >
              <Upload size={14} />
              Import CSV
            </Link>
            <button
              type="button"
              onClick={openAdd}
              className="flex items-center gap-1.5 rounded-lg bg-signal-red px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              <Plus size={16} />
              Add trade
            </button>
          </>
        }
      />

      {error ? <p className="text-xs text-signal-red">Couldn't load your trades: {error}</p> : null}

      {isLoading ? (
        <div className="flex flex-col gap-3" role="status" aria-label="Loading your trades">
          <Skeleton className="h-9 w-full max-w-sm" />
          <div className="overflow-hidden rounded-xl border border-line bg-bg-1">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="border-b border-line px-4 py-3 last:border-b-0">
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        </div>
      ) : trades.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-bg-2 text-text-muted">
              <NotebookPen size={20} />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-text">No trades yet</h2>
              <p className="mt-1 max-w-sm text-sm text-text-muted">
                Log your first trade, or bring in your history from a CSV file.
              </p>
            </div>
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={openAdd}
                className="flex items-center gap-1.5 rounded-lg bg-signal-red px-3.5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Plus size={16} />
                Add trade
              </button>
              <Link
                to="/trades/import"
                className="flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-text transition-colors hover:bg-bg-2"
              >
                <Upload size={14} />
                Import CSV
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <TradesToolbar filters={filters} onChange={changeFilters} onClear={clearFilters} />

          <div className="overflow-hidden rounded-xl border border-line bg-bg-1">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 border-b border-line px-4 py-2.5 text-xs text-text-muted">
              <span>
                {filtered.length} trade{filtered.length === 1 ? "" : "s"}
                {hasFilters ? ` of ${trades.length}` : ""}
              </span>
              {filtered.length > 0 ? (
                <span className="flex items-center gap-3">
                  <span
                    className={`font-mono ${
                      filteredPnl >= 0 ? "text-signal-green" : "text-signal-red"
                    }`}
                  >
                    {formatSignedDollars(filteredPnl)}
                  </span>
                  {filteredWinRate !== null ? (
                    <span>{(filteredWinRate * 100).toFixed(0)}% win rate</span>
                  ) : null}
                </span>
              ) : null}
            </div>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
                <p className="text-sm text-text-muted">No trades match these filters.</p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-bg-2"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <TradesTable
                trades={pageData.items}
                sort={sort}
                onSort={changeSort}
                flaggedTradeIds={flaggedTradeIds}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}

            <Pagination
              page={pageData.page}
              pageCount={pageData.pageCount}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZES}
              from={pageData.from}
              to={pageData.to}
              total={pageData.total}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        </div>
      )}

      <Dialog
        isOpen={isAddOpen}
        onClose={closeAdd}
        title="Add trade"
        description="Prices and lots in, P&L worked out for you."
        closeOnBackdrop={false}
      >
        {isAtFreeLimit ? (
          <UpgradePrompt feature={`Logging more than ${FREE_TRADE_LIMIT} trades/month`} />
        ) : (
          <TradeForm
            variant="plain"
            initialDate={addDate}
            onSubmit={handleAddTrade}
            onSaved={(addAnother) => {
              if (!addAnother) closeAdd();
            }}
            onCancel={closeAdd}
          />
        )}
      </Dialog>

      <TradeDrawer
        trade={selectedTrade}
        isFlagged={selectedTrade ? flaggedTradeIds.has(selectedTrade.id) : false}
        onClose={() => setSelectedId(null)}
        onUpdate={updateTrade}
        onDelete={deleteTrade}
      />
    </div>
  );
}