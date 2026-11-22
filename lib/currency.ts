// Prices are stored and charged in NGN (kobo). Other currencies are display-only.

export type CurrencyCode = string;

export const STORE_CURRENCY: CurrencyCode = "NGN";

export const SUPPORTED_CURRENCIES: CurrencyCode[] = [
  "NGN", "USD", "EUR", "GBP", "GHS", "KES", "ZAR", "CAD", "AUD", "CHF",
  "AED", "SAR", "KWD", "INR", "CNY", "JPY", "KRW", "SGD", "ILS", "BRL", "MXN",
];

// fallback for countries we don't support
export const FALLBACK_FOREIGN_CURRENCY: CurrencyCode = "USD";

const EURO_COUNTRIES = [
  "AT", "BE", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT", "LU",
  "MT", "NL", "PT", "SK", "SI", "ES", "MC", "SM", "VA", "AD", "ME", "XK",
];

const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  NG: "NGN", US: "USD", GB: "GBP", GH: "GHS", KE: "KES", ZA: "ZAR", CA: "CAD",
  AU: "AUD", CH: "CHF", LI: "CHF", AE: "AED", SA: "SAR", KW: "KWD", IN: "INR",
  CN: "CNY", JP: "JPY", KR: "KRW", SG: "SGD", IL: "ILS", BR: "BRL", MX: "MXN",
  ...Object.fromEntries(EURO_COUNTRIES.map((country) => [country, "EUR"])),
};

export function isSupportedCurrency(value: unknown): value is CurrencyCode {
  return typeof value === "string" && SUPPORTED_CURRENCIES.includes(value);
}

// NGN when we don't know the country (e.g. local dev)
export function currencyForCountry(country: string | null | undefined): CurrencyCode {
  if (!country) return STORE_CURRENCY;
  return COUNTRY_CURRENCY[country.toUpperCase()] ?? FALLBACK_FOREIGN_CURRENCY;
}

export function currencyDecimals(currency: CurrencyCode): number {
  return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function currencyName(currency: CurrencyCode, locale = "en"): string {
  return new Intl.DisplayNames([locale], { type: "currency" }).of(currency) ?? currency;
}

// "12,500.5" -> minor units, using string math so rounding can't change the amount
export function toMinorUnits(input: string, currency: CurrencyCode): number | null {
  const decimals = currencyDecimals(currency);
  const match = input.trim().replace(/^\p{Sc}\s*/u, "").replace(/,/g, "").match(/^(\d+)(?:\.(\d*))?$/);
  if (!match) return null;
  const [, whole, fraction = ""] = match;
  if (fraction.length > decimals) return null;
  const minor = Number(whole + fraction.padEnd(decimals, "0"));
  return Number.isSafeInteger(minor) ? minor : null;
}

export function formatMinorUnits(amountMinor: number, currency: CurrencyCode, locale = "en"): string {
  return formatMajorUnits(amountMinor / 10 ** currencyDecimals(currency), currency, locale);
}

export function formatMajorUnits(amount: number, currency: CurrencyCode, locale = "en"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(amount);
}

export type ExchangeRates = {
  base: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  updatedAt: string;
};

export function convertMinorUnits(
  amountMinor: number,
  from: CurrencyCode,
  to: CurrencyCode,
  { rates, base }: ExchangeRates,
): number | null {
  const fromRate = from === base ? 1 : rates[from];
  const toRate = to === base ? 1 : rates[to];
  if (!fromRate || !toRate) return null;
  return (amountMinor / 10 ** currencyDecimals(from) / fromRate) * toRate;
}

export type PaymentRequest = {
  // minor units (kobo, cents, ...)
  amountMinor: number;
  currency: CurrencyCode;
};
