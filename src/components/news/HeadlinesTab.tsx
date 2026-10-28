import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  ErrorState,
  LoadingRows,
  SourceNote,
  StaleNotice,
} from "@/components/news/parts";
import { useMarketNews } from "@/hooks/useMarketNews";
import { formatAge, parseHeadlinesPayload } from "@/lib/news/news";

export function HeadlinesTab(): JSX.Element {
  const { data, isLoading, error, reload } = useMarketNews("headlines", parseHeadlinesPayload);
  const now = new Date();

  return (
    <div className="flex flex-col gap-4">
      <Card className="!p-0">
        {isLoading && !data ? (
          <div className="p-5">
            <LoadingRows count={10} />
          </div>
        ) : error && !data ? (
          <div className="px-5">
            <ErrorState message={error} onRetry={reload} />
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="px-5 py-8 text-sm text-text-muted">
            No recent headlines. Check back in a few minutes.
          </p>
        ) : (
          <div>
            {data.stale ? (
              <div className="px-4 pt-4">
                <StaleNotice />
              </div>
            ) : null}
            <ul className="divide-y divide-line">
              {data.items.map((headline) => (
                <li key={headline.id}>
                  <a
                    href={headline.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-start justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-bg-2/50"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-text group-hover:underline group-hover:underline-offset-2">
                        {headline.title}
                      </span>
                      <span className="mt-1 block text-xs text-text-muted">
                        {headline.source} · {formatAge(headline.publishedAt, now)}
                      </span>
                    </span>
                    <ExternalLink size={14} className="mt-1 shrink-0 text-text-faint" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <SourceNote>
        Headlines open on the publisher's site. Marked only shows the title and a link.
      </SourceNote>
    </div>
  );
}