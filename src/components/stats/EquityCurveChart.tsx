import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "@/hooks/useTheme";
import type { EquityPoint } from "@/lib/calculations";

interface EquityCurveChartProps {
  points: EquityPoint[];
}

const PALETTE = {
  light: { green: "#1F7A4D", red: "#C1372A", line: "#E4E4E7", muted: "#6E6E76" },
  dark: { green: "#3FAE72", red: "#E2584B", line: "#27272C", muted: "#8C8C93" },
};

export function EquityCurveChart({
  points,
}: EquityCurveChartProps): JSX.Element {
  const { theme } = useTheme();
  const palette = PALETTE[theme];

  if (points.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-line bg-bg-1">
        <p className="text-sm text-text-muted">
          Your equity curve will show up once you've logged a trade.
        </p>
      </div>
    );
  }

  const lastPoint = points[points.length - 1];
  const isPositive = (lastPoint?.cumulativePnl ?? 0) >= 0;

  return (
    <div className="h-56 rounded-xl border border-line bg-bg-1 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <XAxis dataKey="date" hide />
          <YAxis
            width={56}
            tick={{ fontFamily: "Geist Mono", fontSize: 11, fill: palette.muted }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: number) => value.toFixed(2)}
            labelFormatter={(label: string) => label}
            contentStyle={{
              fontFamily: "Geist Mono",
              fontSize: 12,
              borderRadius: 8,
              border: `1px solid ${palette.line}`,
            }}
          />
          <Line
            type="monotone"
            dataKey="cumulativePnl"
            stroke={isPositive ? palette.green : palette.red}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}