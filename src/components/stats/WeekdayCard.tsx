import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { Card } from "@/components/ui/Card";
import { useTheme } from "@/hooks/useTheme";
import type { WeekdayStats } from "@/lib/calculations";
import { formatCompactDollars, formatSignedDollars } from "@/utils/format";

interface WeekdayCardProps {
  stats: WeekdayStats[];
  className?: string;
}

const PALETTE = {
  light: { green: "#1F7A4D", red: "#C1372A", muted: "#6E6E76", hover: "#00000008" },
  dark: { green: "#3FAE72", red: "#E2584B", muted: "#8C8C93", hover: "#FFFFFF0A" },
};

function WeekdayTooltip({
  active,
  payload,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload?.length) return null;
  const stat = payload[0]?.payload as WeekdayStats | undefined;
  if (!stat) return null;
  return (
    <div className="rounded-lg border border-line bg-bg-1 px-3 py-2 shadow-lg">
      <p className="text-xs text-text-muted">{stat.label}</p>
      <p
        className={`mt-1 font-mono text-sm font-medium ${
          stat.pnl >= 0 ? "text-signal-green" : "text-signal-red"
        }`}
      >
        {formatSignedDollars(stat.pnl)}
      </p>
      <p className="mt-0.5 text-xs text-text-muted">
        {stat.trades} trade{stat.trades === 1 ? "" : "s"}
      </p>
    </div>
  );
}

export function WeekdayCard({ stats, className = "" }: WeekdayCardProps): JSX.Element {
  const { theme } = useTheme();
  const palette = PALETTE[theme];
  const hasData = stats.some((s) => s.trades > 0);

  return (
    <Card
      title="P&L by weekday"
      description="Which days you trade best"
      className={className}
    >
      {hasData ? (
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fontFamily: "Geist Mono", fontSize: 11, fill: palette.muted }}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
              />
              <YAxis
                width={48}
                tickFormatter={formatCompactDollars}
                tick={{ fontFamily: "Geist Mono", fontSize: 11, fill: palette.muted }}
                axisLine={false}
                tickLine={false}
              />
              <ReferenceLine y={0} stroke={palette.muted} strokeOpacity={0.5} />
              <Tooltip content={<WeekdayTooltip />} cursor={{ fill: palette.hover }} />
              <Bar dataKey="pnl" radius={[4, 4, 4, 4]} maxBarSize={28} isAnimationActive={false}>
                {stats.map((s) => (
                  <Cell key={s.label} fill={s.pnl >= 0 ? palette.green : palette.red} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="py-16 text-center text-sm text-text-muted">
          Nothing to show yet.
        </p>
      )}
    </Card>
  );
}