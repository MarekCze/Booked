import { formatInTimeZone } from "date-fns-tz";

// Re-export shared formatters so existing imports from "@/lib/format" keep working
export { formatPrice, formatDuration } from "@clipbook/shared/format";

/**
 * Format an ISO timestamp in a tenant's timezone.
 * e.g. formatTime("2024-03-14T09:00:00Z", "Europe/Dublin") → "09:00"
 */
export function formatTime(iso: string, timezone: string): string {
  return formatInTimeZone(new Date(iso), timezone, "HH:mm");
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
