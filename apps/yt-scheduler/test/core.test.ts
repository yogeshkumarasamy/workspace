import { describe, expect, it } from "vitest";
import { backoffMs, isQuotaError, isRetryable } from "../src/backoff.js";
import { decrypt, encrypt } from "../src/crypto.js";
import { createJob, InputError } from "../src/jobs.js";
import { canAfford, JOB_COST, quotaDay } from "../src/quota.js";
import { JobInputSchema, MetadataSchema } from "../src/schema.js";
import { DEFAULT_RULES, nextFreeSlot } from "../src/slots.js";
import { buildVideoResource } from "../src/youtube.js";
import { seeded } from "./helpers.js";

describe("schema", () => {
  it("applies kid-channel defaults", () => {
    const m = MetadataSchema.parse({ title: "மீயாழ் Ep 1" });
    expect(m).toMatchObject({ madeForKids: true, defaultLanguage: "ta", privacyStatus: "private", type: "long", containsSyntheticMedia: false });
  });
  it("rejects long titles and bad publishAt", () => {
    expect(MetadataSchema.safeParse({ title: "x".repeat(101) }).success).toBe(false);
    expect(MetadataSchema.safeParse({ title: "a", publishAt: "tomorrow" }).success).toBe(false);
  });
  it("accepts url or drive sources and requires channel", () => {
    const base = { idempotencyKey: "k", metadata: { title: "t" } };
    expect(JobInputSchema.safeParse({ ...base, channel: "@c", video: "https://x.com/a.mp4" }).success).toBe(true);
    expect(JobInputSchema.safeParse({ ...base, channel: "@c", video: { driveFileId: "1234567890abc" } }).success).toBe(true);
    expect(JobInputSchema.safeParse({ ...base, video: "https://x.com/a.mp4" }).success).toBe(false);
    expect(JobInputSchema.safeParse({ ...base, channel: "@c", video: "http://insecure/a.mp4" }).success).toBe(false);
  });
});

describe("slots", () => {
  const now = new Date("2026-10-14T02:00:00Z"); // 07:30 IST
  it("shorts go daily at 07:00 IST, skipping today if past and taken slots", () => {
    const s1 = nextFreeSlot("short", now, [], DEFAULT_RULES);
    expect(s1.toISOString()).toBe("2026-10-15T01:30:00.000Z");
    const s2 = nextFreeSlot("short", now, [s1], DEFAULT_RULES);
    expect(s2.toISOString()).toBe("2026-10-16T01:30:00.000Z");
  });
  it("long episodes go weekly on Saturday 18:00 IST", () => {
    const s = nextFreeSlot("long", now, [], DEFAULT_RULES);
    expect(s.toISOString()).toBe("2026-10-17T12:30:00.000Z");
    expect(nextFreeSlot("long", now, [s]).toISOString()).toBe("2026-10-24T12:30:00.000Z");
  });
  it("handles DST zones", () => {
    const s = nextFreeSlot("short", new Date("2026-03-07T20:00:00Z"), [], { ...DEFAULT_RULES, timezone: "America/New_York" });
    expect(s.toISOString()).toBe("2026-03-08T11:00:00.000Z"); // 07:00 EDT
  });
});

describe("backoff & quota", () => {
  it("grows exponentially and caps", () => {
    expect(backoffMs(1, () => 0.5)).toBe(60_000);
    expect(backoffMs(3, () => 0.5)).toBe(240_000);
    expect(backoffMs(20, () => 0.5)).toBe(3_600_000);
  });
  it("classifies errors", () => {
    expect(isQuotaError(new Error("quotaExceeded"))).toBe(true);
    expect(isRetryable(Object.assign(new Error("bad"), { code: 400 }))).toBe(false);
    expect(isRetryable(Object.assign(new Error("x"), { code: 503 }))).toBe(true);
  });
  it("quota day uses Pacific time and budget math", () => {
    expect(quotaDay(new Date("2026-10-14T06:00:00Z"))).toBe("2026-10-13");
    expect(JOB_COST).toBe(1701);
    expect(canAfford(8000, 10000)).toBe(true);
    expect(canAfford(8400, 10000)).toBe(false);
  });
});

describe("crypto", () => {
  it("round-trips", () => {
    const k = Buffer.alloc(32, 7).toString("base64");
    const e = encrypt("refresh-token", k);
    expect(e).not.toContain("refresh-token");
    expect(decrypt(e, k)).toBe("refresh-token");
  });
});

describe("createJob", () => {
  const now = new Date("2026-10-14T02:00:00Z");
  it("resolves handle, applies channel playlist default, auto-slots, is idempotent", async () => {
    const { store, ch } = await seeded();
    const raw = { idempotencyKey: "s1", video: { driveFileId: "1234567890abc" }, metadata: { title: "Short 1", type: "short", channel: "@MeeyazhPirai" } };
    const a = await createJob(raw, store, now);
    expect(a.created).toBe(true);
    expect(a.job.channelId).toBe(ch.id);
    expect(a.job.metadata.playlist).toBe("Meeyazh & Pirai Shorts");
    expect(a.job.publishAt?.toISOString()).toBe("2026-10-15T01:30:00.000Z");
    const b = await createJob(raw, store, now);
    expect(b.created).toBe(false);
    expect(b.job.id).toBe(a.job.id);
    const c = await createJob({ ...raw, idempotencyKey: "s2" }, store, now);
    expect(c.job.publishAt?.toISOString()).toBe("2026-10-16T01:30:00.000Z");
  });
  it("rejects unknown channel and uploadAt after publishAt", async () => {
    const { store } = await seeded();
    await expect(createJob({ idempotencyKey: "x", channel: "@nope", video: "https://a.b/c.mp4", metadata: { title: "t" } }, store, now)).rejects.toBeInstanceOf(InputError);
    await expect(createJob({ idempotencyKey: "x", channel: "@meeyazhpirai", video: "https://a.b/c.mp4", uploadMode: "at", uploadAt: "2026-10-20T00:00:00Z", metadata: { title: "t", publishAt: "2026-10-19T00:00:00Z" } }, store, now)).rejects.toThrow(/uploadAt/);
  });
});

describe("video resource", () => {
  it("forces private + publishAt for future schedule and tags shorts", () => {
    const m = MetadataSchema.parse({ title: "t", type: "short", privacyStatus: "public" });
    const r = buildVideoResource(m, new Date(Date.now() + 86_400_000));
    expect(r.status.privacyStatus).toBe("private");
    expect(r.status.publishAt).toBeDefined();
    expect(r.status.selfDeclaredMadeForKids).toBe(true);
    expect(r.snippet.description).toContain("#Shorts");
  });
});
