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
 * Formats an ISO date string (YYYY-MM-DD, YYYY-MM, or YYYY) into a readable retro format.
 * Examples:
 * - "2025-04-17" -> "Apr 17, 2025"
 * - "2025-04" -> "Apr 2025"
 * - "2025" -> "2025"
 *
 * If the input does not match expected patterns, returns the original string safely.
 */
export function formatArticleDate(dateStr: string): string {
  if (!dateStr || typeof dateStr !== "string") {
    return "";
  }

  const trimmed = dateStr.trim();
  const parts = trimmed.split("-");

  if (parts.length === 3) {
    const [yearStr, monthStr, dayStr] = parts;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);

    if (
      !isNaN(year) &&
      !isNaN(month) &&
      !isNaN(day) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      const monthName = MONTH_NAMES[month - 1];
      return `${monthName} ${day}, ${year}`;
    }
  } else if (parts.length === 2) {
    const [yearStr, monthStr] = parts;
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (!isNaN(year) && !isNaN(month) && month >= 1 && month <= 12) {
      const monthName = MONTH_NAMES[month - 1];
      return `${monthName} ${year}`;
    }
  }

  return trimmed;
}
