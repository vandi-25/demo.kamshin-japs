import "server-only";

import { STORE_CURRENCY, type ExchangeRates } from "@/lib/currency";

// free, no key needed
const RATES_URL = process.env.EXCHANGE_RATES_URL ?? "https://open.er-api.com/v6/latest";

// Cached for an hour. Returns null if the API is down (we just show naira then).
export async function getExchangeRates(base = STORE_CURRENCY): Promise<ExchangeRates | null> {
  try {
    const res = await fetch(`${RATES_URL}/${base}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (
      !data ||
      typeof data !== "object" ||
      !("result" in data) ||
      data.result !== "success" ||
      !("rates" in data) ||
      typeof data.rates !== "object" ||
      data.rates === null
    ) {
      return null;
    }
    const { base_code, time_last_update_utc } = data as { base_code?: string; time_last_update_utc?: string };
    return {
      base: base_code ?? base,
      rates: data.rates as Record<string, number>,
      updatedAt: time_last_update_utc ?? "",
    };
  } catch {
    return null;
  }
}
