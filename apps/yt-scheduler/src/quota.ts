import { wallParts, zonedToUtc } from "./time.js";

/** YouTube Data API v3 unit costs. */
export const COST = { videosInsert: 1600, thumbnailsSet: 50, playlistItemsInsert: 50, playlistsList: 1, playlistsInsert: 50, videosUpdate: 50 } as const;
export const JOB_COST = COST.videosInsert + COST.thumbnailsSet + COST.playlistItemsInsert + COST.playlistsList;

/** Quota resets at midnight America/Los_Angeles. Returns the key for the current quota day. */
export function quotaDay(now: Date): string {
  const p = wallParts(now, "America/Los_Angeles");
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}
export function nextQuotaReset(now: Date): Date {
  const p = wallParts(now, "America/Los_Angeles");
  const n = new Date(Date.UTC(p.y, p.m - 1, p.d + 1));
  return zonedToUtc(n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate(), 0, 5, "America/Los_Angeles");
}
export function canAfford(used: number, limit: number, cost = JOB_COST): boolean {
  return used + cost <= limit;
}
