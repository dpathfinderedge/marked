export interface FxRateResult {
  rate: number;
  date: string;
}

export class FxRateError extends Error {}

export async function fetchFxRate(
  from: string,
  to: string,
): Promise<FxRateResult> {
  if (from === to) {
    return { rate: 1, date: new Date().toISOString().slice(0, 10) };
  }

  const url = `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(from)}/${encodeURIComponent(to)}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new FxRateError("Couldn't reach the exchange rate service.");
  }

  if (!response.ok) {
    let message = `Exchange rate service returned an error (${response.status}).`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // Body wasn't JSON — stick with the generic message above.
    }
    throw new FxRateError(message);
  }

  const data = (await response.json()) as {
    date: string;
    base: string;
    quote: string;
    rate: number;
  };

  if (typeof data.rate !== "number") {
    throw new FxRateError(`No rate available for ${from}/${to}.`);
  }

  return { rate: data.rate, date: data.date };
}