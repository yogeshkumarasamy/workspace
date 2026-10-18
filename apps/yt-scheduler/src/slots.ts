import { wallParts, zonedToUtc } from "./time.js";

export interface SlotRules {
  timezone: string; // e.g. Asia/Kolkata
  shortsTime: string; // "07:00" daily
  longWeekday: number; // 0=Sun..6=Sat
  longTime: string; // "18:00"
  minLeadMinutes: number; // don't schedule closer than this to now
}
export const DEFAULT_RULES: SlotRules = { timezone: "Asia/Kolkata", shortsTime: "07:00", longWeekday: 6, longTime: "18:00", minLeadMinutes: 60 };

/**
 * Next free publish slot for a video type. Shorts: daily at shortsTime; long: weekly on longWeekday.
 * `taken` = publishAt instants already used by other jobs of the same type.
 */
export function nextFreeSlot(type: "short" | "long", now: Date, taken: Date[], rules: SlotRules = DEFAULT_RULES): Date {
  const [hh, mm] = (type === "short" ? rules.shortsTime : rules.longTime).split(":").map(Number) as [number, number];
  const takenSet = new Set(taken.map((t) => Math.floor(t.getTime() / 60000)));
  const earliest = now.getTime() + rules.minLeadMinutes * 60000;
  const start = wallParts(now, rules.timezone);
  for (let i = 0; i < 800; i++) {
    const day = new Date(Date.UTC(start.y, start.m - 1, start.d + i));
    if (type === "long" && day.getUTCDay() !== rules.longWeekday) continue;
    const slot = zonedToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), hh, mm, rules.timezone);
    if (slot.getTime() < earliest) continue;
    if (takenSet.has(Math.floor(slot.getTime() / 60000))) continue;
    return slot;
  }
  throw new Error("no free slot within horizon");
}
