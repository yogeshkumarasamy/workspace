/** Offset (ms) of tz at instant d: local wall time minus UTC. */
export function tzOffsetMs(d: Date, tz: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(d).map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!);
  return asUtc - Math.floor(d.getTime() / 1000) * 1000;
}
/** Convert a wall-clock date/time in tz to a UTC Date. */
export function zonedToUtc(y: number, m: number, day: number, hh: number, mm: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, day, hh, mm);
  const off = tzOffsetMs(new Date(guess), tz);
  const first = guess - off;
  const off2 = tzOffsetMs(new Date(first), tz);
  return new Date(guess - off2);
}
/** Wall-clock parts of instant d in tz. */
export function wallParts(d: Date, tz: string) {
  const shifted = new Date(d.getTime() + tzOffsetMs(d, tz));
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth() + 1, d: shifted.getUTCDate(), weekday: shifted.getUTCDay() };
}
