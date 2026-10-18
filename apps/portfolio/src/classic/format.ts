const MONTHS = [
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

function monthName(month: string): string | null {
  const index = Number(month) - 1;
  return MONTHS[index] ?? null;
}

/** Formats `YYYY-MM`. Unknown input is returned unchanged. */
export function formatYearMonth(value: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  const month = monthName(match[2]);
  if (!month) return value;
  return `${month} ${match[1]}`;
}

/** Formats `YYYY-MM-DD`. Unknown input is returned unchanged. */
export function formatIsoDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const month = monthName(match[2]);
  if (!month) return value;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

export function formatRoleDates(start: string, end: string | null): string {
  const startLabel = formatYearMonth(start);
  const endLabel = end === null ? "Present" : formatYearMonth(end);
  return `${startLabel} \u2013 ${endLabel}`;
}

/** https links only. Profile data is trusted, but Classic view still refuses other schemes. */
export function httpsHref(href: string): string | null {
  return /^https:\/\//i.test(href) ? href : null;
}
