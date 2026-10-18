import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../yt-scheduler/src/store.ts";
import { createApi } from "../src/app.ts";
import { encrypt, decrypt } from "../src/crypto.ts";
import { DRIVE_FILE_SCOPE, DRIVE_READONLY_SCOPE, authUrl, oauthScopes } from "../src/google.ts";
import { parseChunkBytes, youtubeStatus } from "../src/publish.ts";
import { mockFetcher, runScheduledUpload, MemoryMedia, immediateStep, type UploadStore } from "../src/upload.ts";
import type { UploadProgress } from "../src/d1-store.ts";
import { queryStatus, transferChunk } from "../src/transfer.ts";
import { MOCK_MEDIA_BYTES } from "../src/publish.ts";
import { schemaStatements } from "../src/schema.ts";

const KEY = "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=";
const now = new Date("2026-10-14T02:00:00Z");

function adapt(store: MemoryStore): UploadStore {
  const progress = new Map<string, UploadProgress>();
  const blank = (): UploadProgress => ({ sessionUri: null, offset: 0, total: null, chunkBytes: null, workflowId: null });
  return {
    getJob: (id) => store.getJob(id),
    updateJob: (id, patch) => store.updateJob(id, patch),
    getChannel: (id) => store.getChannel(id),
    addQuota: (id, day, units) => store.addQuota(id, day, units),
    quotaUsed: (day) => store.quotaUsed(day),
    async uploadProgress(id) {
      return progress.get(id) ?? blank();
    },
    async saveUpload(id, patch) {
      progress.set(id, { ...(progress.get(id) ?? blank()), ...patch });
      if (patch.videoId) await store.updateJob(id, { youtubeVideoId: patch.videoId });
    },
    async claimJob(id) {
      const job = await store.getJob(id);
      if (!job || job.status !== "queued") return false;
      await store.updateJob(id, { status: "uploading" });
      return true;
    },
  };
}

describe("publish status", () => {
  const meta = { privacyStatus: "private" as const, madeForKids: true, containsSyntheticMedia: false };
  it("schedules a public video with YouTube's private+publishAt pair", () => {
    const publishAt = new Date("2026-10-20T01:30:00Z");
    const status = youtubeStatus(meta, publishAt, now);
    expect(status.privacyStatus).toBe("private");
    expect(status.publishAt).toBe(publishAt.toISOString());
  });
  it("does not leave an immediate upload private", () => {
    expect(youtubeStatus(meta, null, now).privacyStatus).toBe("public");
    expect(youtubeStatus(meta, new Date("2026-10-01T00:00:00Z"), now).privacyStatus).toBe("public");
  });
  it("keeps an explicit unlisted upload unlisted", () => {
    expect(youtubeStatus({ ...meta, privacyStatus: "unlisted" }, null, now).privacyStatus).toBe("unlisted");
  });
});

describe("chunk size", () => {
  it("defaults to 64 MiB and rejects sizes that are not 256 KiB aligned", () => {
    expect(parseChunkBytes(undefined)).toBe(64 * 1024 * 1024);
    expect(parseChunkBytes(256 * 1024)).toBe(256 * 1024);
    expect(() => parseChunkBytes(256 * 1024 + 1)).toThrow(/256 KiB/);
    expect(() => parseChunkBytes(128 * 1024 * 1024)).toThrow(/64 MiB/);
  });
});

describe("oauth scopes", () => {
  it("requests drive.file unless DRIVE_SCOPE=readonly", () => {
    expect(oauthScopes("file")).toContain(DRIVE_FILE_SCOPE);
    expect(oauthScopes("file")).not.toContain(DRIVE_READONLY_SCOPE);
    expect(oauthScopes("readonly")).toContain(DRIVE_READONLY_SCOPE);
    const url = new URL(authUrl({ clientId: "id", redirectUri: "https://yt-scheduler-api-prod.coderdevelopment.workers.dev/oauth/callback", state: "abc", drive: "file" }));
    expect(url.searchParams.get("scope")).toContain(DRIVE_FILE_SCOPE);
    expect(url.searchParams.get("redirect_uri")).toBe("https://yt-scheduler-api-prod.coderdevelopment.workers.dev/oauth/callback");
  });
});

describe("mock resumable transfer", () => {
  it("streams a range into the sink and ignores an overlapping retry", async () => {
    const media = new MemoryMedia();
    await media.save("job", { total: MOCK_MEDIA_BYTES, received: 0, videoId: null });
    const fetcher = mockFetcher(media);
    const sink = "mock://upload/job";
    const firstEnd = 256 * 1024 - 1;
    const first = await transferChunk({ fetcher, sourceUrl: "mock://source/job", sinkUrl: sink, offset: 0, endInclusive: firstEnd, totalSize: MOCK_MEDIA_BYTES });
    expect(first.status).toBe(308);
    expect(first.received).toBe(256 * 1024);
    const status = await queryStatus(fetcher, sink, MOCK_MEDIA_BYTES);
    expect(status.received).toBe(256 * 1024);
    const retry = await transferChunk({ fetcher, sourceUrl: "mock://source/job", sinkUrl: sink, offset: 0, endInclusive: firstEnd, totalSize: MOCK_MEDIA_BYTES });
    expect(retry.received).toBe(256 * 1024);
    expect((await media.get("job"))?.received).toBe(256 * 1024);
  });
});

describe("http api", () => {
  it("connects a mock channel and publishes a scheduled job without calling Google", async () => {
    const store = new MemoryStore();
    const uploadStore = adapt(store);
    const media = new MemoryMedia();
    const app = createApi({
      store,
      apiKey: "preview-pr-1",
      encryptionKey: KEY,
      dailyQuota: 10000,
      youtubeMode: "mock",
      driveScope: "file",
      corsOrigin: "https://dev.yogeshkumarasamy.in",
      appPublicUrl: "https://dev.yogeshkumarasamy.in/previews/yt-scheduler/pr-1/",
      sha: "abc",
      environment: "preview",
      google: null,
      now: () => now,
      startUpload: (jobId) => runScheduledUpload(immediateStep(), {
        youtubeMode: "mock",
        chunkBytes: 256 * 1024,
        dailyQuota: 10000,
        encryptionKey: KEY,
        google: null,
        now: () => now,
        store: uploadStore,
        media,
      }, jobId),
    });
    const health = await app.request("/api/health");
    expect(health.headers.get("access-control-allow-origin")).toBeNull();
    expect(await health.json()).toMatchObject({ ok: true, youtubeMode: "mock" });

    const denied = await app.request("/api/channels", { headers: { "x-api-key": "nope" } });
    expect(denied.status).toBe(401);

    const start = await app.request("/oauth/start?key=preview-pr-1");
    expect(start.status).toBe(302);
    expect(start.headers.get("location")).toContain("connected=Mock%20Channel");
    const channels = await app.request("/api/channels", { headers: { "x-api-key": "preview-pr-1" } });
    const listed = await channels.json() as { title: string; youtubeChannelId: string }[];
    expect(listed[0]).toMatchObject({ title: "Mock Channel", youtubeChannelId: "UCmockchannel0001" });

    const created = await app.request("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": "preview-pr-1" },
      body: JSON.stringify({ idempotencyKey: "ep-1", channel: "@mock", video: { driveFileId: "mockvideo01" }, metadata: { title: "Ep 1", type: "long" } }),
    });
    expect(created.status).toBe(201);
    const job = (await (await app.request("/api/jobs", { headers: { "x-api-key": "preview-pr-1" } })).json()) as { status: string; youtubeVideoId: string; log: { msg: string }[]; publishAt: string }[];
    expect(job[0]?.status).toBe("scheduled");
    expect(job[0]?.youtubeVideoId.startsWith("mock")).toBe(true);
    expect(job[0]?.publishAt).toBeTruthy();
    expect(job[0]?.log.map((entry) => entry.msg).join("\n")).toMatch(/publicly/);
    expect((await media.get(job.length ? (await store.listJobs({}))[0]!.id : ""))?.received).toBe(MOCK_MEDIA_BYTES);
  });
});

describe("schema", () => {
  it("collapses each statement onto one line for local D1 exec", () => {
    const statements = schemaStatements("CREATE TABLE IF NOT EXISTS channels (\n  id TEXT PRIMARY KEY\n);\n-- note\nCREATE INDEX IF NOT EXISTS jobs_due ON jobs (status);");
    expect(statements).toEqual([
      "CREATE TABLE IF NOT EXISTS channels ( id TEXT PRIMARY KEY )",
      "CREATE INDEX IF NOT EXISTS jobs_due ON jobs (status)",
    ]);
  });
});

describe("crypto", () => {
  it("round-trips a refresh token", async () => {
    const blob = await encrypt("refresh-token", KEY);
    expect(await decrypt(blob, KEY)).toBe("refresh-token");
  });
});
