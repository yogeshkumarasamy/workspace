import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../yt-scheduler/src/store.ts";
import { DEFAULT_RULES } from "../../yt-scheduler/src/slots.ts";
import type { Metadata } from "../../yt-scheduler/src/schema.ts";
import { createApi } from "../src/app.ts";
import {
  CHUNK_INTERNAL_SUBREQUESTS,
  HANDOFF_INTERNAL_SUBREQUESTS,
  InstanceBudget,
  maxChunkStepsPerInstance,
} from "../src/budget.ts";
import { encrypt, decrypt } from "../src/crypto.ts";
import { DRIVE_FILE_SCOPE, DRIVE_READONLY_SCOPE, authUrl, oauthScopes, refreshTokenEncFor } from "../src/google.ts";
import { parseChunkBytes, youtubeStatus } from "../src/publish.ts";
import { mockFetcher, prepareUpload, runScheduledUpload, transferJobChunk, MemoryMedia, immediateStep, type UploadEnv, type UploadStore } from "../src/upload.ts";
import type { UploadProgress } from "../src/d1-store.ts";
import { queryStatus, transferChunk, type ChunkFetcher } from "../src/transfer.ts";
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
  it("keeps youtube and drive scopes on separate consent screens", () => {
    // Google rejects YouTube scopes requested together with other scopes.
    const youtube = oauthScopes("youtube", "file");
    expect(youtube).toContain("https://www.googleapis.com/auth/youtube.upload");
    expect(youtube).toContain("https://www.googleapis.com/auth/youtube");
    expect(youtube).not.toContain(DRIVE_FILE_SCOPE);
    expect(youtube).not.toContain(DRIVE_READONLY_SCOPE);
    const drive = oauthScopes("drive", "file");
    expect(drive).toContain(DRIVE_FILE_SCOPE);
    expect(drive).not.toContain("https://www.googleapis.com/auth/youtube.upload");
    expect(drive).not.toContain("https://www.googleapis.com/auth/youtube");
    expect(oauthScopes("drive", "readonly")).toContain(DRIVE_READONLY_SCOPE);
    expect(oauthScopes("drive", "readonly")).not.toContain(DRIVE_FILE_SCOPE);
    const url = new URL(authUrl({ clientId: "id", redirectUri: "https://yt-scheduler-api-prod.coderdevelopment.workers.dev/oauth/callback", state: "abc", purpose: "youtube", drive: "file" }));
    expect(url.searchParams.get("scope")).not.toContain(DRIVE_FILE_SCOPE);
    expect(url.searchParams.get("redirect_uri")).toBe("https://yt-scheduler-api-prod.coderdevelopment.workers.dev/oauth/callback");
    const driveUrl = new URL(authUrl({ clientId: "id", redirectUri: "https://yt-scheduler-api-prod.coderdevelopment.workers.dev/oauth/callback", state: "abc", purpose: "drive", drive: "file" }));
    expect(driveUrl.searchParams.get("scope")).toContain(DRIVE_FILE_SCOPE);
    expect(driveUrl.searchParams.get("scope")).not.toContain("https://www.googleapis.com/auth/youtube");
    expect(driveUrl.searchParams.get("include_granted_scopes")).toBe("false");
    expect(url.searchParams.get("include_granted_scopes")).toBe("false");
    expect(driveUrl.searchParams.get("access_type")).toBe("offline");
    expect(driveUrl.searchParams.get("prompt")).toContain("consent");
  });

  it("uses the Drive refresh token for Drive calls and the YouTube token for YouTube calls", () => {
    const channel = { refreshTokenEnc: "yt", driveRefreshTokenEnc: "drive" };
    expect(refreshTokenEncFor(channel, "drive")).toBe("drive");
    expect(refreshTokenEncFor(channel, "youtube")).toBe("yt");
    expect(refreshTokenEncFor({ refreshTokenEnc: "yt", driveRefreshTokenEnc: null }, "drive")).toBe("yt");
  });
});

describe("drive access token", () => {
  const headers = { "x-api-key": "preview-pr-1" };

  it("mints the Drive token for Picker, list, and file preview, and the YouTube token for playlists", async () => {
    const store = new MemoryStore();
    const channel = await seedChannel(store, "drive-enc");
    const purposes: string[] = [];
    const app = liveApi({
      store,
      driveScope: "file",
      accessTokenFor: async (ch, purpose = "youtube") => {
        purposes.push(purpose);
        return `access:${refreshTokenEncFor(ch, purpose)}`;
      },
    });
    const picker = await app.request(`/api/google/access-token?channel=${channel.id}`, { headers });
    expect(picker.status).toBe(200);
    expect(await picker.json()).toEqual({ accessToken: "access:drive-enc" });

    const auths: string[] = [];
    const restore = stubFetch(async (input, init) => {
      auths.push(`${String(input)} ${new Headers(init?.headers).get("authorization")}`);
      const url = String(input);
      if (url.includes("alt=media")) return new Response(Uint8Array.from([1, 2, 3]), { status: 200, headers: { "content-type": "image/jpeg" } });
      if (url.includes("/drive/")) return jsonResponse({ name: "thumb.jpg", mimeType: "image/jpeg", size: "3", files: [] });
      return jsonResponse({ items: [{ id: "PLmockplaylist01", snippet: { title: "Shorts" } }] });
    });
    try {
      const list = await app.request(`/api/drive/list?channel=${channel.id}&folderId=root`, { headers });
      expect(list.status).toBe(200);
      const file = await app.request(`/api/drive/file/thumb1?channel=${channel.id}`, { headers });
      expect(file.status).toBe(200);
      expect(file.headers.get("content-type")).toBe("image/jpeg");
      const playlists = await app.request(`/api/channels/${channel.id}/playlists`, { headers });
      expect(playlists.status).toBe(200);
      expect(await playlists.json()).toEqual([{ id: "PLmockplaylist01", title: "Shorts" }]);
    } finally {
      restore();
    }
    expect(purposes).toEqual(["drive", "drive", "drive", "youtube"]);
    expect(auths.filter((line) => line.includes("/drive/")).every((line) => line.endsWith("Bearer access:drive-enc"))).toBe(true);
    expect(auths.filter((line) => line.includes("/youtube/")).every((line) => line.endsWith("Bearer access:yt-enc"))).toBe(true);
  });

  it("returns 409 from Picker until Drive is connected, and Drive list falls back to the YouTube token", async () => {
    for (const driveScope of ["file", "readonly"] as const) {
      const store = new MemoryStore();
      const channel = await seedChannel(store, null);
      const purposes: string[] = [];
      const app = liveApi({
        store,
        driveScope,
        accessTokenFor: async (ch, purpose = "youtube") => {
          purposes.push(`${purpose}:${refreshTokenEncFor(ch, purpose)}`);
          return `access:${refreshTokenEncFor(ch, purpose)}`;
        },
      });
      const picker = await app.request(`/api/google/access-token?channel=${channel.id}`, { headers });
      expect(picker.status).toBe(409);
      expect(await picker.json()).toEqual({ error: "Connect Drive first (Channels → Use separate Drive account). The same Google account is fine." });
      expect(purposes).toEqual([]);
      let authorization: string | null = null;
      const restore = stubFetch(async (_input, init) => {
        authorization = new Headers(init?.headers).get("authorization");
        return jsonResponse({ files: [] });
      });
      try {
        const list = await app.request(`/api/drive/list?channel=${channel.id}&folderId=root`, { headers });
        expect(list.status).toBe(200);
      } finally {
        restore();
      }
      expect(purposes).toEqual(["drive:yt-enc"]);
      expect(authorization).toBe("Bearer access:yt-enc");
    }
  });

  it("opens the YouTube upload with the YouTube token and reads Drive with the Drive token", async () => {
    const store = new MemoryStore();
    const uploadStore = adapt(store);
    const yt = await encrypt("yt-refresh", KEY);
    const drive = await encrypt("drive-refresh", KEY);
    const channel = await seedChannel(store, drive, yt);
    const total = 1024;
    const { job } = await store.insertJob(queuedJob(channel.id, "drive-upload"));
    const refreshes: string[] = [];
    const auths: { url: string; authorization: string | null }[] = [];
    const restore = stubFetch(async (input, init) => {
      const url = String(input);
      if (url.includes("oauth2.googleapis.com/token")) {
        const refresh = new URLSearchParams(bodyText(init?.body)).get("refresh_token") ?? "";
        refreshes.push(refresh);
        return jsonResponse({ access_token: `access:${refresh}`, expires_in: 3600 });
      }
      auths.push({ url, authorization: new Headers(init?.headers).get("authorization") });
      if (url.includes("/drive/")) return jsonResponse({ name: "ep.mp4", mimeType: "video/mp4", size: String(total) });
      return new Response(null, { status: 200, headers: { Location: "https://upload.example/session" } });
    });
    const env: UploadEnv = {
      youtubeMode: "live",
      chunkBytes: total,
      dailyQuota: 10000,
      encryptionKey: KEY,
      google: { clientId: "id", clientSecret: "secret" },
      now: () => now,
      store: uploadStore,
      media: new MemoryMedia(),
    };
    try {
      const prepared = await prepareUpload(env, job.id);
      expect(prepared.total).toBe(total);
      expect(refreshes).toEqual(["yt-refresh", "drive-refresh"]);
      expect(auths.filter((call) => call.url.includes("/drive/")).every((call) => call.authorization === "Bearer access:drive-refresh")).toBe(true);
      expect(auths.filter((call) => call.url.includes("upload/youtube")).every((call) => call.authorization === "Bearer access:yt-refresh")).toBe(true);
    } finally {
      restore();
    }

    const seen: { url: string; authorization: string | null }[] = [];
    let sinkCalls = 0;
    await transferJobChunk({
      ...env,
      fetcher: {
        async fetch(url, init) {
          seen.push({ url, authorization: new Headers(init?.headers).get("authorization") });
          if (url.includes("/drive/")) return new Response(new Uint8Array(total), { status: 206 });
          sinkCalls += 1;
          if (sinkCalls === 1) return jsonResponse({ received: 0 }, 308);
          return jsonResponse({ id: "vid123", received: total });
        },
      },
    }, job.id, 0, total - 1);
    expect(seen.filter((call) => call.url.includes("/drive/")).every((call) => call.authorization === "Bearer access:drive-refresh")).toBe(true);
    expect(seen.filter((call) => call.url.includes("upload.example")).every((call) => call.authorization === "Bearer access:yt-refresh")).toBe(true);
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
      appPublicUrl: "https://dev.yogeshkumarasamy.in/preview/yt-scheduler/pr-1/",
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

describe("instance subrequest budget", () => {
  it("fits 16 chunk steps in the 50 external subrequests", () => {
    expect(maxChunkStepsPerInstance()).toBe(16);
    expect(maxChunkStepsPerInstance() * 3).toBeLessThanOrEqual(50);
    expect((maxChunkStepsPerInstance() + 1) * 3).toBeGreaterThan(50);
  });

  it("finishes a file that fits in one instance without handing off", async () => {
    const room = maxChunkStepsPerInstance();
    const result = await runMockUpload({ chunks: room, chunkBytes: 1024 });
    expect(result.instances).toBe(1);
    expect(result.received).toBe(room * 1024);
    expect(result.streamed).toBe(room * 1024);
    expect(result.appended).toBe(room * 1024);
    expect(result.status).not.toBe("failed");
    expect(result.log).not.toMatch(/paused at byte/);
  });

  it("resumes a file longer than one instance and finishes with the right bytes", async () => {
    const room = maxChunkStepsPerInstance();
    const chunks = room + 2;
    const result = await runMockUpload({ chunks, chunkBytes: 1024 });
    expect(result.instances).toBe(2);
    expect(result.received).toBe(chunks * 1024);
    expect(result.streamed).toBe(chunks * 1024);
    expect(result.appended).toBe(chunks * 1024);
    expect(result.status).not.toBe("failed");
    expect(result.lastError ?? "").not.toMatch(/mismatch|did not advance/i);
    expect(result.log).toContain(`upload paused at byte ${room * 1024}`);
    expect(result.log).toMatch(/next Workflow instance continues the same session/);
  });

  it("stops on the D1 ledger before the external cap and still completes", async () => {
    // Opening prepare is 9 D1 queries. One chunk reserves 8 and the handoff reserves 5.
    const internalLimit = 9 + CHUNK_INTERNAL_SUBREQUESTS + HANDOFF_INTERNAL_SUBREQUESTS;
    const chunks = 3;
    const result = await runMockUpload({
      chunks,
      chunkBytes: 1024,
      budget: () => new InstanceBudget(50, internalLimit),
    });
    expect(result.instances).toBe(chunks);
    expect(result.received).toBe(chunks * 1024);
    expect(result.streamed).toBe(chunks * 1024);
    expect(result.status).not.toBe("failed");
    expect(result.lastError ?? "").not.toMatch(/mismatch|did not advance/i);
  });

  it("does not fail the job when the platform reports the subrequest cap", async () => {
    const store = new MemoryStore();
    const uploadStore = adapt(store);
    const media = new MemoryMedia();
    const channel = await store.upsertChannel({
      youtubeChannelId: "UCmockchannel0001",
      handle: "mock",
      title: "Mock Channel",
      refreshTokenEnc: "enc",
      googleEmail: null,
      driveRefreshTokenEnc: null,
      defaults: {},
      slots: DEFAULT_RULES,
    });
    const { job } = await store.insertJob(queuedJob(channel.id, "cap"));
    let continued = false;
    await runScheduledUpload(immediateStep(), {
      ...mockEnv(uploadStore, media, 2048),
      chunkBytes: 1024,
      budget: new InstanceBudget(10_000, 10_000),
      fetcher: { fetch: async () => { throw new Error("Too many subrequests"); } },
      continueUpload: async () => { continued = true; },
    }, job.id);
    const saved = await store.getJob(job.id);
    expect(saved?.status).toBe("uploading");
    expect(saved?.lastError).toBeNull();
    expect(saved?.log.map((entry) => entry.msg).join("\n")).toMatch(/paused at byte/);
    expect(continued).toBe(true);
  });

  it("adopts a sink cursor behind the saved offset instead of failing the transfer", async () => {
    const store = new MemoryStore();
    const uploadStore = adapt(store);
    const media = new MemoryMedia();
    const channel = await store.upsertChannel({
      youtubeChannelId: "UCmockchannel0002",
      handle: "mock2",
      title: "Mock Channel",
      refreshTokenEnc: "enc",
      googleEmail: null,
      driveRefreshTokenEnc: null,
      defaults: {},
      slots: DEFAULT_RULES,
    });
    const total = 2048;
    const { job } = await store.insertJob({ ...queuedJob(channel.id, "behind"), status: "uploading" });
    await uploadStore.saveUpload(job.id, { sessionUri: `mock://upload/${job.id}`, offset: 1024, total, chunkBytes: 1024 });
    await media.save(job.id, { total, received: 0, videoId: null });
    let appended = 0;
    const save = media.save.bind(media);
    media.save = async (id, row) => {
      const prev = media.rows.get(id);
      if (prev && row.received > prev.received) appended += row.received - prev.received;
      await save(id, row);
    };
    await runScheduledUpload(immediateStep(), mockEnv(uploadStore, media, total), job.id);
    const saved = await store.getJob(job.id);
    expect(saved?.status).toBe("published");
    expect(saved?.lastError).toBeNull();
    expect((await media.get(job.id))?.received).toBe(total);
    expect(appended).toBe(total);
  });
});

const metadata = (title: string): Metadata => ({
  title,
  description: "",
  tags: [],
  categoryId: "1",
  defaultLanguage: "ta",
  defaultAudioLanguage: "ta",
  madeForKids: true,
  containsSyntheticMedia: false,
  type: "long",
  privacyStatus: "public",
  createPlaylistIfMissing: false,
});

function queuedJob(channelId: string, key: string) {
  return {
    channelId,
    idempotencyKey: key,
    status: "queued" as const,
    video: { kind: "drive" as const, fileId: "mockvideo01" },
    thumbnail: null,
    metadata: metadata(key),
    uploadMode: "now" as const,
    runAt: now,
    publishAt: null,
    attempts: 0,
    lastError: null,
    youtubeVideoId: null,
    warnings: [],
    log: [],
  };
}

function mockEnv(store: UploadStore, media: MemoryMedia, total: number, budget?: InstanceBudget): UploadEnv {
  return {
    youtubeMode: "mock",
    chunkBytes: 1024,
    mockMediaBytes: total,
    dailyQuota: 10000,
    encryptionKey: KEY,
    google: null,
    now: () => now,
    store,
    media,
    budget,
  };
}

async function runMockUpload(options: { chunks: number; chunkBytes: number; budget?: () => InstanceBudget }) {
  const store = new MemoryStore();
  const uploadStore = adapt(store);
  const media = new MemoryMedia();
  let appended = 0;
  const save = media.save.bind(media);
  media.save = async (id, row) => {
    const prev = media.rows.get(id);
    if (prev && row.received > prev.received) appended += row.received - prev.received;
    await save(id, row);
  };
  const inner = mockFetcher(media);
  let streamed = 0;
  const fetcher: ChunkFetcher = {
    async fetch(url, init) {
      const response = await inner.fetch(url, init);
      if (new URL(url).hostname !== "source" || !response.body) return response;
      const reader = response.body.getReader();
      const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
          const next = await reader.read();
          if (next.done) {
            controller.close();
            return;
          }
          streamed += next.value.byteLength;
          controller.enqueue(next.value);
        },
      });
      return new Response(body, { status: response.status, headers: response.headers });
    },
  };
  let instances = 0;
  const total = options.chunks * options.chunkBytes;
  const run = async (jobId: string): Promise<void> => {
    instances += 1;
    if (instances > 12) throw new Error(`upload did not finish after ${instances} instances`);
    await runScheduledUpload(immediateStep(), {
      ...mockEnv(uploadStore, media, total, options.budget?.()),
      chunkBytes: options.chunkBytes,
      fetcher,
      continueUpload: (id) => run(id),
    }, jobId);
  };
  const app = createApi({
    store,
    apiKey: "preview-pr-1",
    encryptionKey: KEY,
    dailyQuota: 10000,
    youtubeMode: "mock",
    driveScope: "file",
    corsOrigin: "https://dev.yogeshkumarasamy.in",
    appPublicUrl: "https://dev.yogeshkumarasamy.in/preview/yt-scheduler/pr-1/",
    sha: "abc",
    environment: "preview",
    google: null,
    now: () => now,
    startUpload: (jobId) => run(jobId),
  });
  await app.request("/oauth/start?key=preview-pr-1");
  const created = await app.request("/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": "preview-pr-1" },
    body: JSON.stringify({ idempotencyKey: `chunks-${options.chunks}`, channel: "@mock", video: { driveFileId: "mockvideo01" }, metadata: { title: "Long", type: "long" } }),
  });
  expect(created.status).toBe(201);
  const jobs = await store.listJobs({});
  const job = jobs[0]!;
  return {
    instances,
    received: (await media.get(job.id))?.received,
    streamed,
    appended,
    status: job.status,
    lastError: job.lastError,
    log: job.log.map((entry) => entry.msg).join("\n"),
  };
}

describe("crypto", () => {
  it("round-trips a refresh token", async () => {
    const blob = await encrypt("refresh-token", KEY);
    expect(await decrypt(blob, KEY)).toBe("refresh-token");
  });
});

let channelSeq = 0;

function seedChannel(store: MemoryStore, driveRefreshTokenEnc: string | null, refreshTokenEnc = "yt-enc") {
  channelSeq += 1;
  return store.upsertChannel({
    youtubeChannelId: `UCdrivetoken${channelSeq}`,
    handle: `@drive${channelSeq}`,
    title: "Real",
    refreshTokenEnc,
    googleEmail: "owner@example.com",
    driveRefreshTokenEnc,
    defaults: {},
    slots: DEFAULT_RULES,
  });
}

function liveApi(overrides: Pick<Parameters<typeof createApi>[0], "store" | "accessTokenFor" | "driveScope"> & Partial<Parameters<typeof createApi>[0]>) {
  return createApi({
    apiKey: "preview-pr-1",
    encryptionKey: KEY,
    dailyQuota: 10000,
    youtubeMode: "live",
    corsOrigin: "https://dev.yogeshkumarasamy.in",
    appPublicUrl: "https://dev.yogeshkumarasamy.in/yt-scheduler/",
    sha: "abc",
    environment: "production",
    google: { clientId: "id", clientSecret: "secret", redirectUri: "https://example.test/oauth/callback" },
    now: () => now,
    startUpload: async () => undefined,
    ...overrides,
  });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function bodyText(body: BodyInit | null | undefined): string {
  if (typeof body === "string") return body;
  if (body instanceof URLSearchParams) return body.toString();
  return "";
}

function stubFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const original = globalThis.fetch;
  globalThis.fetch = impl as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}
