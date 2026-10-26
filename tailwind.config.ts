import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-0": "rgb(var(--bg-0) / <alpha-value>)",
        "bg-1": "rgb(var(--bg-1) / <alpha-value>)",
        "bg-2": "rgb(var(--bg-2) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        "line-strong": "rgb(var(--line-strong) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        "text-muted": "rgb(var(--text-muted) / <alpha-value>)",
        "text-faint": "rgb(var(--text-faint) / <alpha-value>)",
        "signal-red": "rgb(var(--signal-red) / <alpha-value>)",
        "signal-green": "rgb(var(--signal-green) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["Geist", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
      keyframes: {
        "sheet-in": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "pop-in": {
          from: { opacity: "0", transform: "translateY(4px) scale(0.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "sheet-in": "sheet-in 240ms cubic-bezier(0.32, 0.72, 0, 1)",
        "fade-in": "fade-in 180ms ease-out",
        "pop-in": "pop-in 140ms ease-out",
      },
      letterSpacing: {
        tightest: "-0.04em",
        widest: "0.14em",
      },
    },
  },
  plugins: [],
} satisfies Config;