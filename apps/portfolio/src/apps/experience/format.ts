import type { Role } from "./types";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * Parses an ISODateMonth string like "2024-07" into { year, month }.
 * Month is 1-indexed (1 = Jan, 12 = Dec).
 */
export function parseYearMonth(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/**
 * Formats "2024-07" into "Jul 2024". Returns value unchanged if invalid format.
 */
export function formatMonthYear(value: string): string {
  const parsed = parseYearMonth(value);
  if (!parsed) return value;
  const name = MONTH_NAMES[parsed.month - 1];
  return `${name} ${parsed.year}`;
}

/**
 * Formats a start and optional end date into "Jul 2024 – Present" or "Jan 2023 – Jul 2024".
 * Uses en-dash "–" (\u2013).
 */
export function formatRoleDates(start: string, end: string | null): string {
  const startStr = formatMonthYear(start);
  const endStr = end === null ? "Present" : formatMonthYear(end);
  return `${startStr} \u2013 ${endStr}`;
}

/**
 * Calculates total inclusive months between two year-month pairs.
 * E.g., 2024-07 to 2024-07 = 1 month.
 * 2023-01 to 2024-07 = 19 months (1 yr 7 mos).
 */
export function calculateMonths(
  start: { year: number; month: number },
  end: { year: number; month: number },
): number {
  const total = (end.year - start.year) * 12 + (end.month - start.month) + 1;
  return total < 0 ? 0 : total;
}

/**
 * Formats a duration in months into standard LinkedIn-style duration string:
 * - 1 -> "1 mo"
 * - 6 -> "6 mos"
 * - 12 -> "1 yr"
 * - 13 -> "1 yr 1 mo"
 * - 19 -> "1 yr 7 mos"
 * - 24 -> "2 yrs"
 * - 28 -> "2 yrs 4 mos"
 */
export function formatDuration(totalMonths: number): string {
  if (totalMonths <= 0) return "0 mos";
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  const yearPart = years > 0 ? `${years} ${years === 1 ? "yr" : "yrs"}` : "";
  const monthPart = months > 0 ? `${months} ${months === 1 ? "mo" : "mos"}` : "";

  if (yearPart && monthPart) {
    return `${yearPart} ${monthPart}`;
  }
  return yearPart || monthPart || "0 mos";
}

/**
 * Computes duration string for a role, given an optional reference date (default: now).
 */
export function computeRoleDuration(role: Role, referenceDate: Date = new Date()): string {
  const start = parseYearMonth(role.start);
  if (!start) return "";

  const end = role.end
    ? parseYearMonth(role.end)
    : {
        year: referenceDate.getFullYear(),
        month: referenceDate.getMonth() + 1,
      };

  if (!end) return "";
  const months = calculateMonths(start, end);
  return formatDuration(months);
}

/**
 * Computes duration string between a start and optional end date.
 */
export function computeDateSpanDuration(
  startIso: string,
  endIso: string | null,
  referenceDate: Date = new Date(),
): string {
  const start = parseYearMonth(startIso);
  if (!start) return "";

  const end = endIso
    ? parseYearMonth(endIso)
    : {
        year: referenceDate.getFullYear(),
        month: referenceDate.getMonth() + 1,
      };

  if (!end) return "";
  const months = calculateMonths(start, end);
  return formatDuration(months);
}
