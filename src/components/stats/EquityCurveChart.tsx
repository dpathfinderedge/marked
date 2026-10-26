import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { useTheme } from "@/hooks/useTheme";
import type { DailyPoint } from "@/lib/calculations";
import { formatShortDate, formatLongDate } from "@/utils/dates";
import {
  formatCompactDollars,
  formatDollars,
  formatSignedDollars,
} from "@/utils/format";

interface EquityCurveChartProps {
  points: DailyPoint[];
  showDrawdown: boolean;
}

const PALETTE = {
  light: { green: "#1F7A4D", red: "#C1372A", line: "#E4E4E7", muted: "#6E6E76", panel: "#FFFFFF" },
  dark: { green: "#3FAE72", red: "#E2584B", line: "#27272C", muted: "#8C8C93", panel: "#131316" },
};

const SYNC_ID = "equity";
const AXIS_TICK_FONT = { fontFamily: "Geist Mono", fontSize: 11 };

function EquityTooltip({
  active,
  payload,
}: TooltipProps<number, string>): JSX.Element | null {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as DailyPoint | undefined;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-line bg-bg-1 px-3 py-2 shadow-lg">
      <p className="text-xs text-text-muted">{formatLongDate(point.date)}</p>
      <p className="mt-1 font-mono text-sm font-medium text-text">
        {formatSignedDollars(point.cumulativePnl)}
      </p>
      {point.trades > 0 ? (
        <p
          className={`mt-0.5 font-mono text-xs ${
            point.pnl >= 0 ? "text-signal-green" : "text-signal-red"
          }`}
        >
          {formatSignedDollars(point.pnl)} · {point.trades} trade
          {point.trades === 1 ? "" : "s"}
        </p>
      ) : null}
      {point.drawdown < 0 ? (
        <p className="mt-0.5 font-mono text-xs text-text-muted">
          Drawdown {formatDollars(point.drawdown)}
        </p>
      ) : null}
    </div>
  );
}

function pickTicks(points: DailyPoint[]): string[] {
  if (points.length <= 6) return points.map((p) => p.date);
  const step = (points.length - 1) / 5;
  return Array.from({ length: 6 }, (_, i) => points[Math.round(i * step)]?.date ?? "");
}

export function EquityCurveChart({
  points,
  showDrawdown,
}: EquityCurveChartProps): JSX.Element {
  const { theme } = useTheme();
  const palette = PALETTE[theme];

  const last = points[points.length - 1];
  const isPositive = (last?.cumulativePnl ?? 0) >= 0;
  const tone = isPositive ? palette.green : palette.red;
  const ticks = pickTicks(points);

  const cursor = { stroke: palette.muted, strokeDasharray: "3 3", strokeWidth: 1 };

  return (
    <div className="flex flex-col">
      <div className="h-64 sm:h-72 xl:h-[32rem]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={points}
            syncId={SYNC_ID}
            margin={{ top: 8, right: 28, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={tone} stopOpacity={0.28} />
                <stop offset="100%" stopColor={tone} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke={palette.line}
              strokeDasharray="3 4"
            />
            <XAxis
              dataKey="date"
              ticks={ticks}
              tickFormatter={formatShortDate}
              tick={{ ...AXIS_TICK_FONT, fill: palette.muted }}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              interval={0}
              hide={showDrawdown}
            />
            <YAxis
              width={52}
              tickFormatter={formatCompactDollars}
              tick={{ ...AXIS_TICK_FONT, fill: palette.muted }}
              axisLine={false}
              tickLine={false}
              domain={[(min: number) => Math.min(0, min), (max: number) => Math.max(0, max)]}
            />
            <ReferenceLine y={0} stroke={palette.muted} strokeOpacity={0.5} />
            <Tooltip content={<EquityTooltip />} cursor={cursor} />
            <Area
              type="monotone"
              dataKey="cumulativePnl"
              stroke={tone}
              strokeWidth={2}
              fill="url(#equityFill)"
              dot={false}
              activeDot={{ r: 4, fill: tone, stroke: palette.panel, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {showDrawdown ? (
        <div className="h-24" aria-label="Drawdown">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={points}
              syncId={SYNC_ID}
              margin={{ top: 4, right: 28, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="drawdownFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={palette.red} stopOpacity={0} />
                  <stop offset="100%" stopColor={palette.red} stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                ticks={ticks}
                tickFormatter={formatShortDate}
                tick={{ ...AXIS_TICK_FONT, fill: palette.muted }}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                interval={0}
              />
              <YAxis
                width={52}
                tickFormatter={formatCompactDollars}
                tick={{ ...AXIS_TICK_FONT, fill: palette.muted }}
                axisLine={false}
                tickLine={false}
                domain={["dataMin", 0]}
                tickCount={2}
              />
              <Tooltip content={() => null} cursor={cursor} />
              <Area
                type="stepAfter"
                dataKey="drawdown"
                stroke={palette.red}
                strokeWidth={1.5}
                fill="url(#drawdownFill)"
                dot={false}
                activeDot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </div>
  );
}