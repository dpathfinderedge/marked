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
      letterSpacing: {
        tightest: "-0.04em",
        widest: "0.14em",
      },
    },
  },
  plugins: [],
} satisfies Config;