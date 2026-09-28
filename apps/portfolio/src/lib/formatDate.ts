const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Format YYYY-MM to "Month YYYY"; null endDate → "Present". */
export function formatMonthYear(value: string | null): string {
  if (!value) return "Present";
  const [year, month] = value.split("-");
  const monthIndex = Number(month) - 1;
  if (!year || Number.isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return value;
  }
  return `${MONTHS[monthIndex]} ${year}`;
}

export function formatDateRange(
  startDate: string,
  endDate: string | null,
): string {
  return `${formatMonthYear(startDate)} – ${formatMonthYear(endDate)}`;
}
