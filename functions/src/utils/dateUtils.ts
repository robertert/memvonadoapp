/**
 * Date/time utilities shared across the codebase.
 *
 * Extracted from deckFunctions.ts and userFunctions.ts where the same
 * formatYmdInTimeZone implementation was duplicated.
 */

/**
 * Format a Date as a YYYY-MM-DD string in the given IANA timezone.
 *
 * @example
 *   formatYmdInTimeZone(new Date("2026-03-03T23:00:00Z"), "Europe/Warsaw")
 *   // → "2026-03-04"  (Warsaw is UTC+1 in winter)
 */
export function formatYmdInTimeZone(date: Date, timeZone: string): string {
  // en-CA locale produces the ISO-style yyyy-mm-dd format natively.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
