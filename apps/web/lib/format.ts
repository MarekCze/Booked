import { formatInTimeZone } from "date-fns-tz";

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
 * Format an ISO timestamp in a tenant's timezone.
 * e.g. formatTime("2024-03-14T09:00:00Z", "Europe/Dublin") → "09:00"
 */
export function formatTime(iso: string, timezone: string): string {
  return formatInTimeZone(new Date(iso), timezone, "HH:mm");
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

/**
 * Format a date for display in a tenant's timezone.
 * e.g. formatDateLabel("2024-03-14", "Europe/Dublin") → "Thu 14"
 */
export function formatDateLabel(dateStr: string, timezone: string): { day: string; date: string } {
  const d = new Date(dateStr + "T12:00:00Z"); // noon UTC to avoid DST edge cases
  const day = formatInTimeZone(d, timezone, "EEE");
  const date = formatInTimeZone(d, timezone, "d");
  return { day, date };
}
