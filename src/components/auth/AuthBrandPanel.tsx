import { BarChart3, CalendarDays, ShieldCheck } from "lucide-react";
import { Stamp } from "@/components/ui/Stamp";
import { FREE_TRADE_LIMIT } from "@/lib/calculations/subscription";

const points = [
  {
    icon: BarChart3,
    title: "Real P&L math",
    body: "Pip and contract-size math for forex, price × quantity for crypto.",
  },
  {
    icon: ShieldCheck,
    title: "Rules that keep you honest",
    body: "A pre-trade checklist, a daily loss limit and a trades-per-day cap.",
  },
  {
    icon: CalendarDays,
    title: "See what actually pays",
    body: "A trading calendar and Insights on which setups make you money.",
  },
];

const SPARKLINE =
  "M0 62 L25 58 L50 64 L75 48 L100 52 L125 38 L150 44 L175 30 L200 34 L225 20 L250 24 L300 8";

export function AuthBrandPanel(): JSX.Element {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-bg-1 p-12 lg:flex xl:p-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 40% at 20% 15%, rgb(var(--signal-green) / 0.12), transparent 70%), radial-gradient(45% 40% at 85% 80%, rgb(var(--signal-red) / 0.12), transparent 70%)",
        }}
      />

      <div className="relative flex items-center gap-3">
        <Stamp size={28} className="text-text" />
        <span className="text-xl font-bold tracking-tight text-text">Marked</span>
      </div>

      <div className="relative max-w-md">
        <h2 className="text-[40px] font-black leading-[1.05] tracking-tightest text-text xl:text-[46px]">
          Know why you're
          <br />
          actually <span className="text-signal-red">winning.</span>
        </h2>
        <p className="mt-5 text-[15px] leading-relaxed text-text-muted">
          A trade journal for forex and crypto traders. Log a trade, and Marked
          works out the rest.
        </p>

        <ul className="mt-9 flex flex-col gap-5">
          {points.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-bg-0 text-signal-red">
                <Icon size={18} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-text">{title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-text-muted">
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-10 rounded-xl border border-line bg-bg-0/80 p-5 backdrop-blur">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-text-muted">Net P&amp;L</p>
              <p className="mt-1 font-mono text-2xl font-semibold text-signal-green">
                +$9,622.50
              </p>
            </div>
            <div className="flex gap-5 text-right">
              <div>
                <p className="text-xs text-text-muted">Win rate</p>
                <p className="mt-1 font-mono text-sm text-text">61%</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">Profit factor</p>
                <p className="mt-1 font-mono text-sm text-text">3.42</p>
              </div>
            </div>
          </div>
          <svg
            viewBox="0 0 300 70"
            preserveAspectRatio="none"
            className="mt-4 h-16 w-full"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="auth-spark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(var(--signal-green))" stopOpacity="0.28" />
                <stop offset="100%" stopColor="rgb(var(--signal-green))" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={`${SPARKLINE} L300 70 L0 70 Z`} fill="url(#auth-spark)" />
            <path
              d={SPARKLINE}
              fill="none"
              stroke="rgb(var(--signal-green))"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <p className="mt-2 text-[11px] text-text-faint">Sample data</p>
        </div>
      </div>

      <p className="relative text-[13px] text-text-muted">
        The free plan includes {FREE_TRADE_LIMIT} trades a month. No card needed.
      </p>
    </aside>
  );
}