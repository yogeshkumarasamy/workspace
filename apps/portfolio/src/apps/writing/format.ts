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

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function monthName(month: string): string | null {
  const index = Number(month) - 1;
  return MONTHS[index] ?? null;
}

/** Calendar `YYYY-MM-DD` only. Anything else is not a machine date. */
export function isoDateTime(value: string): string | null {
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return value;
}

/** Visible label for a calendar date. Unknown input is returned unchanged. */
export function formatIsoDate(value: string): string {
  const match = ISO_DATE.exec(value);
  if (!match) return value;
  const month = monthName(match[2]);
  if (!month) return value;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

/** Article and profile links are https-only. Other schemes are not rendered as links. */
export function httpsHref(href: string): string | null {
  return /^https:\/\//i.test(href) ? href : null;
}
