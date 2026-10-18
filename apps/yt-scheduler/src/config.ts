import type { SlotRules } from "./slots.js";

const env = (k: string, d?: string) => {
  const v = process.env[k] ?? d;
  if (v === undefined || v === "") throw new Error(`missing env ${k}`);
  return v;
};

export function loadConfig() {
  return {
    port: Number(process.env.PORT ?? 8787),
    appUrl: env("APP_URL", "http://localhost:8787"),
    databaseUrl: env("DATABASE_URL"),
    apiKey: env("API_KEY"),
    encryptionKey: env("ENCRYPTION_KEY"),
    google: { clientId: env("GOOGLE_CLIENT_ID"), clientSecret: env("GOOGLE_CLIENT_SECRET"), redirectUri: env("GOOGLE_REDIRECT_URI", `${process.env.APP_URL ?? "http://localhost:8787"}/oauth/callback`) },
    tickSeconds: Number(process.env.TICK_SECONDS ?? 30),
    dailyQuota: Number(process.env.DAILY_QUOTA_UNITS ?? 10000),
    /** Set true once Google approves the API audit; otherwise uploads are private-locked. */
    audited: process.env.YOUTUBE_API_AUDITED === "true",
    defaultSlots: {
      timezone: process.env.SCHEDULE_TIMEZONE ?? "Asia/Kolkata",
      shortsTime: process.env.SHORTS_TIME ?? "07:00",
      longWeekday: Number(process.env.LONG_WEEKDAY ?? 6),
      longTime: process.env.LONG_TIME ?? "18:00",
      minLeadMinutes: 60,
    } satisfies SlotRules,
  };
}
export type Config = ReturnType<typeof loadConfig>;
