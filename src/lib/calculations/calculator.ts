import type { ContractSize, Direction } from "@/types/trade";
import { getPipSize, resolveContractUnits } from "./forex";

export type Calc<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): Calc<T> => ({ ok: true, value });
const fail = <T>(error: string): Calc<T> => ({ ok: false, error });

const isPositive = (n: number): boolean => Number.isFinite(n) && n > 0;

export function normalizePair(pair: string): string {
  return pair.replace(/[^a-zA-Z]/g, "").toUpperCase();
}

export function isValidForexPair(pair: string): boolean {
  return /^[A-Z]{6}$/.test(normalizePair(pair));
}

export function isCrossPair(pair: string): boolean {
  const p = normalizePair(pair);
  return isValidForexPair(p) && !p.startsWith("USD") && !p.endsWith("USD");
}

export function isMetalPair(pair: string): boolean {
  return /^X(AU|AG|PT|PD)/.test(normalizePair(pair));
}

export function quoteCurrency(pair: string): string {
  return normalizePair(pair).slice(3, 6);
}

export interface PipValueInput {
  pair: string;
  contractSize: ContractSize;
  customContractUnits?: number;
  price?: number;
  quoteToUsdRate?: number;
}

export function pipValuePerLot(input: PipValueInput): Calc<number> {
  const pair = normalizePair(input.pair);
  if (!isValidForexPair(pair)) return fail("Enter a 6-letter pair like EURUSD.");

  let units: number;
  try {
    units = resolveContractUnits({
      lots: 1,
      contractSize: input.contractSize,
      customContractUnits: input.customContractUnits,
    });
  } catch {
    return fail("Enter how many units one lot holds.");
  }

  const pipInQuote = getPipSize(pair) * units;

  if (pair.endsWith("USD")) return ok(pipInQuote);

  if (pair.startsWith("USD")) {
    if (!isPositive(input.price ?? 0)) {
      return fail(`Enter the current ${pair} price to price a pip in dollars.`);
    }
    return ok(pipInQuote / (input.price as number));
  }

  if (!isPositive(input.quoteToUsdRate ?? 0)) {
    return fail(`Enter the ${quoteCurrency(pair)} to USD rate to price a pip in dollars.`);
  }
  return ok(pipInQuote * (input.quoteToUsdRate as number));
}

export function riskFromPercent(balance: number, percent: number): number {
  if (!isPositive(balance) || !isPositive(percent)) return 0;
  return (balance * percent) / 100;
}

function directionFromStop(entry: number, stop: number): Direction {
  return stop < entry ? "long" : "short";
}

export interface ForexPositionInput extends PipValueInput {
  entry: number;
  stop: number;
  riskAmount: number;
}

export interface ForexPositionResult {
  direction: Direction;
  stopPips: number;
  stopDistance: number;
  pipValuePerLot: number;
  lotsExact: number;
  lots: number;
  riskAtLots: number;
  units: number;
}

export function forexPositionSize(input: ForexPositionInput): Calc<ForexPositionResult> {
  if (!isPositive(input.entry) || !isPositive(input.stop)) {
    return fail("Enter an entry price and a stop-loss price.");
  }
  if (input.entry === input.stop) return fail("The stop can't be at the entry price.");
  if (!isPositive(input.riskAmount)) return fail("Enter how much you want to risk.");

  const pip = pipValuePerLot({ ...input, price: input.price ?? input.entry });
  if (!pip.ok) return fail(pip.error);

  const stopDistance = Math.abs(input.entry - input.stop);
  const stopPips = stopDistance / getPipSize(input.pair);
  const lotsExact = input.riskAmount / (stopPips * pip.value);
  const lots = Math.floor(lotsExact * 100 + 1e-6) / 100;

  let unitsPerLot: number;
  try {
    unitsPerLot = resolveContractUnits({
      lots: 1,
      contractSize: input.contractSize,
      customContractUnits: input.customContractUnits,
    });
  } catch {
    return fail("Enter how many units one lot holds.");
  }

  return ok({
    direction: directionFromStop(input.entry, input.stop),
    stopPips,
    stopDistance,
    pipValuePerLot: pip.value,
    lotsExact,
    lots,
    riskAtLots: lots * stopPips * pip.value,
    units: lots * unitsPerLot,
  });
}

export interface RiskRewardInput {
  entry: number;
  stop: number;
  target: number;
  riskAmount?: number;
  pair?: string;
}

export interface RiskRewardResult {
  direction: Direction;
  riskDistance: number;
  rewardDistance: number;
  riskPercent: number;
  rewardPercent: number;
  riskPips: number | null;
  rewardPips: number | null;
  ratio: number;
  breakEvenWinRate: number;
  rewardAmount: number | null;
}

export function riskReward(input: RiskRewardInput): Calc<RiskRewardResult> {
  const { entry, stop, target } = input;
  if (!isPositive(entry) || !isPositive(stop) || !isPositive(target)) {
    return fail("Enter an entry, a stop-loss and a target price.");
  }
  if (entry === stop) return fail("The stop can't be at the entry price.");

  const isLong = stop < entry;
  const targetOnRightSide = isLong ? target > entry : target < entry;
  if (!targetOnRightSide) {
    return fail(
      isLong
        ? "For a long trade the target has to be above the entry."
        : "For a short trade the target has to be below the entry.",
    );
  }

  const riskDistance = Math.abs(entry - stop);
  const rewardDistance = Math.abs(target - entry);
  const ratio = rewardDistance / riskDistance;

  const pipSize =
    input.pair && isValidForexPair(input.pair) ? getPipSize(normalizePair(input.pair)) : null;
  const hasRisk = input.riskAmount !== undefined && isPositive(input.riskAmount);

  return ok({
    direction: isLong ? "long" : "short",
    riskDistance,
    rewardDistance,
    riskPercent: (riskDistance / entry) * 100,
    rewardPercent: (rewardDistance / entry) * 100,
    riskPips: pipSize === null ? null : riskDistance / pipSize,
    rewardPips: pipSize === null ? null : rewardDistance / pipSize,
    ratio,
    breakEvenWinRate: 1 / (1 + ratio),
    rewardAmount: hasRisk ? (input.riskAmount as number) * ratio : null,
  });
}

export interface CryptoPositionInput {
  balance: number;
  entry: number;
  stop: number;
  riskAmount: number;
  leverage: number;
  maintenanceMarginPercent: number;
}

export interface CryptoPositionResult {
  direction: Direction;
  quantity: number;
  notional: number;
  margin: number;
  stopDistance: number;
  stopPercent: number;
  liquidationPrice: number | null;
  liquidatesBeforeStop: boolean;
  marginExceedsBalance: boolean;
}

export function cryptoPositionSize(input: CryptoPositionInput): Calc<CryptoPositionResult> {
  if (!isPositive(input.entry) || !isPositive(input.stop)) {
    return fail("Enter an entry price and a stop-loss price.");
  }
  if (input.entry === input.stop) return fail("The stop can't be at the entry price.");
  if (!isPositive(input.riskAmount)) return fail("Enter how much you want to risk.");
  if (!isPositive(input.leverage) || input.leverage < 1) {
    return fail("Leverage has to be 1 or more (use 1 for spot).");
  }
  if (!Number.isFinite(input.maintenanceMarginPercent) || input.maintenanceMarginPercent < 0) {
    return fail("Maintenance margin can't be negative.");
  }

  const direction = directionFromStop(input.entry, input.stop);
  const stopDistance = Math.abs(input.entry - input.stop);
  const quantity = input.riskAmount / stopDistance;
  const notional = quantity * input.entry;
  const margin = notional / input.leverage;

  const mmr = input.maintenanceMarginPercent / 100;
  let liquidationPrice: number | null = null;
  let liquidatesBeforeStop = false;

  if (input.leverage > 1) {
    liquidationPrice =
      direction === "long"
        ? input.entry * (1 - 1 / input.leverage + mmr)
        : input.entry * (1 + 1 / input.leverage - mmr);
    liquidatesBeforeStop =
      direction === "long" ? liquidationPrice >= input.stop : liquidationPrice <= input.stop;
  }

  return ok({
    direction,
    quantity,
    notional,
    margin,
    stopDistance,
    stopPercent: (stopDistance / input.entry) * 100,
    liquidationPrice,
    liquidatesBeforeStop,
    marginExceedsBalance: isPositive(input.balance) && margin > input.balance,
  });
}