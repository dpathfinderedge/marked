import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { CryptoPositionTool } from "@/components/calculator/CryptoPositionTool";
import { ForexPositionTool } from "@/components/calculator/ForexPositionTool";
import { PipValueTool } from "@/components/calculator/PipValueTool";
import { RiskRewardTool } from "@/components/calculator/RiskRewardTool";

type Market = "forex" | "crypto";
type Tool = "position" | "pip" | "rr";

const MARKET_OPTIONS: { value: Market; label: string }[] = [
  { value: "forex", label: "Forex" },
  { value: "crypto", label: "Crypto" },
];

const TOOLS: Record<Market, { value: Tool; label: string }[]> = {
  forex: [
    { value: "position", label: "Position size" },
    { value: "pip", label: "Pip value" },
    { value: "rr", label: "Risk / reward" },
  ],
  crypto: [
    { value: "position", label: "Position size" },
    { value: "rr", label: "Risk / reward" },
  ],
};

export function CalculatorPage(): JSX.Element {
  const [market, setMarket] = useState<Market>("forex");
  const [requestedTool, setRequestedTool] = useState<Tool>("position");

  const tools = TOOLS[market];
  const tool = tools.some((t) => t.value === requestedTool) ? requestedTool : "position";

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      <PageHeader
        title="Calculator"
        description="Work out your size and your risk before you place the trade."
      />

      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          label="Market"
          options={MARKET_OPTIONS}
          value={market}
          onChange={setMarket}
        />
        <SegmentedControl label="Tool" options={tools} value={tool} onChange={setRequestedTool} />
      </div>

      {tool === "position" ? (
        market === "forex" ? (
          <ForexPositionTool key="forex-position" />
        ) : (
          <CryptoPositionTool key="crypto-position" />
        )
      ) : tool === "pip" ? (
        <PipValueTool key="pip" />
      ) : (
        <RiskRewardTool key={`rr-${market}`} market={market} />
      )}
    </div>
  );
}