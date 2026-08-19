export type Market = "forex" | "crypto";

export type Direction = "long" | "short";

export type Session = "Asian" | "London" | "New York" | "Overlap";

export type CalcMode = "direct" | "converted" | "manual";

export type ContractSize = "standard" | "mini" | "micro" | "custom";

export interface Trade {
  id: string;
  userId: string;
  date: string; 
  pair: string; 
  market: Market;
  direction: Direction;
  session: Session;
  tag: string; 
  risk: number | null; 
  pnl: number; 
  pips: number | null; 
  rMultiple: number | null; 
  notes: string;
  calcMode: CalcMode;
}

export interface ForexCalcInput {
  pair: string;
  direction: Direction;
  entryPrice: number;
  exitPrice: number;
  lots: number;
  contractSize: ContractSize;
  customContractUnits?: number; 
}

export interface CryptoCalcInput {
  direction: Direction;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
}
