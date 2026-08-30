/**
 * Money is always handled as integer cents to avoid floating-point
 * rounding errors. Convert to/from a display dollar amount only at
 * the UI boundary.
 */

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function formatCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(centsToDollars(cents));
}

export function sumCents(amounts: number[]): number {
  return amounts.reduce((total, cents) => total + cents, 0);
}
