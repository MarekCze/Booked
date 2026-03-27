/**
 * Format price from cents to display string.
 * e.g. formatPrice(1500, "EUR") → "€15.00"
 */
export function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/**
 * Format duration in minutes to a human-readable string.
 * e.g. formatDuration(90) → "1 hr 30 min"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}
