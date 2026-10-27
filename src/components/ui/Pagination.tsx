import { ChevronLeft, ChevronRight } from "lucide-react";
import { pageWindow } from "@/lib/calculations";

interface PaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  pageSizeOptions: number[];
  from: number;
  to: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const BUTTON =
  "flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40";

export function Pagination({
  page,
  pageCount,
  pageSize,
  pageSizeOptions,
  from,
  to,
  total,
  onPageChange,
  onPageSizeChange,
}: PaginationProps): JSX.Element {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t border-line px-4 py-3">
      <p className="text-xs text-text-muted">
        {total === 0 ? "No trades" : `Showing ${from}–${to} of ${total}`}
      </p>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-xs text-text-muted">
          Per page
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="rounded-lg border border-line bg-bg-0 px-2 py-1 text-xs text-text outline-none focus:border-line-strong"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        {pageCount > 1 ? (
          <nav aria-label="Pages" className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Previous page"
              className={`${BUTTON} text-text-muted hover:bg-bg-2 hover:text-text`}
            >
              <ChevronLeft size={15} />
            </button>

            <span className="px-2 text-xs text-text-muted sm:hidden">
              {page} / {pageCount}
            </span>

            <div className="hidden items-center gap-1 sm:flex">
              {pageWindow(page, pageCount).map((entry, i) =>
                entry === "…" ? (
                  <span key={`gap-${i}`} className="px-1 text-xs text-text-faint">
                    …
                  </span>
                ) : (
                  <button
                    key={entry}
                    type="button"
                    onClick={() => onPageChange(entry)}
                    aria-label={`Page ${entry}`}
                    aria-current={entry === page ? "page" : undefined}
                    className={`${BUTTON} font-mono ${
                      entry === page
                        ? "bg-bg-2 text-text"
                        : "text-text-muted hover:bg-bg-2 hover:text-text"
                    }`}
                  >
                    {entry}
                  </button>
                ),
              )}
            </div>

            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= pageCount}
              aria-label="Next page"
              className={`${BUTTON} text-text-muted hover:bg-bg-2 hover:text-text`}
            >
              <ChevronRight size={15} />
            </button>
          </nav>
        ) : null}
      </div>
    </div>
  );
}