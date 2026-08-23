const HEADERS = [
  "date",
  "market",
  "pair",
  "direction",
  "session",
  "tag",
  "entryPrice",
  "exitPrice",
  "lots",
  "contractSize",
  "customContractUnits",
  "quantity",
  "risk",
  "manualPnl",
  "notes",
];

const EXAMPLE_ROWS = [
  [
    "2026-08-01",
    "forex",
    "EURUSD",
    "long",
    "London",
    "breakout",
    "1.0850",
    "1.0900",
    "1",
    "standard",
    "",
    "",
    "50",
    "",
    "Clean breakout above range",
  ],
  [
    "2026-08-02",
    "crypto",
    "BTCUSDT",
    "short",
    "Overlap",
    "reversal",
    "65000",
    "64000",
    "",
    "",
    "",
    "0.05",
    "30",
    "",
    "Faded the spike",
  ],
];

export function buildCsvTemplate(): string {
  const lines = [
    HEADERS.join(","),
    ...EXAMPLE_ROWS.map((row) => row.join(",")),
  ];
  return lines.join("\n");
}

export function downloadCsvTemplate(): void {
  const csv = buildCsvTemplate();
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "marked-trade-import-template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}