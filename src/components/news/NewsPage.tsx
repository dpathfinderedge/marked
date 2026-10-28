import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { CalendarTab } from "@/components/news/CalendarTab";
import { HeadlinesTab } from "@/components/news/HeadlinesTab";

type Tab = "calendar" | "headlines";

const TABS: { value: Tab; label: string }[] = [
  { value: "calendar", label: "Economic calendar" },
  { value: "headlines", label: "Headlines" },
];

export function NewsPage(): JSX.Element {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "headlines" ? "headlines" : "calendar";

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        title="News"
        description="What's scheduled and what's moving the market."
        actions={
          <SegmentedControl
            label="News section"
            options={TABS}
            value={tab}
            onChange={(next) => setParams(next === "calendar" ? {} : { tab: next }, { replace: true })}
          />
        }
      />
      {tab === "calendar" ? <CalendarTab /> : <HeadlinesTab />}
    </div>
  );
}