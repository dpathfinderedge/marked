import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EquityPoint } from "@/lib/calculations";

interface EquityCurveChartProps {
  points: EquityPoint[];
}

export function EquityCurveChart({
  points,
}: EquityCurveChartProps): JSX.Element {
  if (points.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-rule bg-surface">
        <p className="font-sans text-sm text-muted">
          Your equity curve will show up once you've logged a trade.
        </p>
      </div>
    );
  }

  const lastPoint = points[points.length - 1];
  const isPositive = (lastPoint?.cumulativePnl ?? 0) >= 0;

  return (
    <div className="h-56 rounded-xl border border-rule bg-surface p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <XAxis
            dataKey="date"
            hide
          />
          <YAxis
            width={56}
            tick={{ fontFamily: "JetBrains Mono", fontSize: 11, fill: "#6B685F" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => value.toFixed(2)}
            labelFormatter={(label: string) => label}
            contentStyle={{
              fontFamily: "JetBrains Mono",
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #D8D5CB",
            }}
          />
          <Line
            type="monotone"
            dataKey="cumulativePnl"
            stroke={isPositive ? "#2F6B4F" : "#A8321F"}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}