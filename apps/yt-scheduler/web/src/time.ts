/** Offset (ms) of tz at instant d. */
function offset(d: Date, tz: string): number {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(d).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!, +p.second!) - Math.floor(d.getTime() / 1000) * 1000;
}
/** Wall-clock parts (y, m 1-12, d, hh, mm, weekday) of an instant in tz. */
export function wall(d: Date, tz: string) {
  const s = new Date(d.getTime() + offset(d, tz));
  return { y: s.getUTCFullYear(), m: s.getUTCMonth() + 1, d: s.getUTCDate(), hh: s.getUTCHours(), mm: s.getUTCMinutes(), wd: s.getUTCDay() };
}
export function fromWall(y: number, m: number, d: number, hh: number, mm: number, tz: string): Date {
  const g = Date.UTC(y, m - 1, d, hh, mm);
  const first = g - offset(new Date(g), tz);
  return new Date(g - offset(new Date(first), tz));
}
const pad = (n: number) => String(n).padStart(2, "0");
/** For <input type="datetime-local"> in tz. */
export function toInput(iso: string | null | undefined, tz: string): string {
  if (!iso) return "";
  const w = wall(new Date(iso), tz);
  return `${w.y}-${pad(w.m)}-${pad(w.d)}T${pad(w.hh)}:${pad(w.mm)}`;
}
export function fromInput(v: string, tz: string): string | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(v);
  if (!m) return undefined;
  return fromWall(+m[1]!, +m[2]!, +m[3]!, +m[4]!, +m[5]!, tz).toISOString();
}
export function fmt(iso: string | null | undefined, tz: string, opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }): string {
  return iso ? new Intl.DateTimeFormat("en-IN", { timeZone: tz, ...opts }).format(new Date(iso)) : "—";
}
export const tzLabel = (tz: string) => (tz === "Asia/Kolkata" ? "IST" : tz);
export const dayKey = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
