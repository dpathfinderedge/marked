import { FREE_TRADE_LIMIT } from "@/lib/calculations";

const LIMIT_MARKER = "FREE_TRADE_LIMIT_REACHED";

export const TRADE_LIMIT_MESSAGE = `You've hit the free plan's ${FREE_TRADE_LIMIT} trades/month limit. Upgrade to Pro to log more.`;

export const SCREENSHOT_PRO_MESSAGE =
  "Screenshots are a Pro feature. Upgrade to Pro to attach them.";

export function friendlyTradeError(message: string): string {
  return message.includes(LIMIT_MARKER) ? TRADE_LIMIT_MESSAGE : message;
}

export function friendlyUploadError(message: string): string {
  return /row-level security|row level security|violates.*polic/i.test(message)
    ? SCREENSHOT_PRO_MESSAGE
    : message;
}