import "server-only";

import { cookies, headers } from "next/headers";

import { currencyForCountry, isSupportedCurrency, type CurrencyCode } from "@/lib/currency";

export const CURRENCY_COOKIE = "kamshin-currency";

// The visitor's chosen currency, or the one for their country (header from Vercel/Cloudflare).
export async function getDisplayCurrency(): Promise<CurrencyCode> {
  const chosen = (await cookies()).get(CURRENCY_COOKIE)?.value;
  if (isSupportedCurrency(chosen)) return chosen;

  const h = await headers();
  return currencyForCountry(h.get("x-vercel-ip-country") ?? h.get("cf-ipcountry"));
}
