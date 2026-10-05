/**
 * Mirrors backend/src/lib/money.ts formatting exactly, so raw cents values
 * from the API (currentBidCents, minimumNextBidCents, etc.) render
 * identically to the backend's own pre-formatted "Display" strings.
 */

export function dollarsToCents(dollars: number): number {
  if (!Number.isFinite(dollars)) throw new Error("Invalid dollar amount");
  return Math.round(dollars * 100);
}

export function centsToDollars(cents: number): number {
  return cents / 100;
}

/** Formats cents as a display string, e.g. 10050 -> "$100.50", 10000 -> "$100" */
export function formatCentsAsUsd(cents: number): string {
  const dollars = cents / 100;
  const hasFraction = cents % 100 !== 0;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(dollars);
  return `$${formatted}`;
}
