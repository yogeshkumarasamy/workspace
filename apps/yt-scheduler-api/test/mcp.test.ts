import { describe, expect, it } from "vitest";
import { MemoryStore } from "../../yt-scheduler/src/store.ts";
import { DEFAULT_RULES } from "../../yt-scheduler/src/slots.ts";
import { createApi, type ApiDeps } from "../src/app.ts";
import type { Env } from "../src/env.ts";
import { handleFetch } from "../src/route.ts";

const API_KEY = "preview-pr-1";
const KEY = "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=";
const now = new Date("2026-10-14T02:00:00Z");
const ctx = { waitUntil() {}, passThroughOnException() {} } as unknown as ExecutionContext;

const TOOLS = [
  "list_channels",
  "get_quota",
  "list_playlists",
  "create_upload_job",
  "list_jobs",
  "get_job",
  "cancel_job",
  "retry_job",
  "reschedule_job",
  "bulk_jobs",
  "get_next_slot",
  "tick_uploads",
  "list_drive_folder",
  "preview_drive_import",
  "import_drive_folder",
  "get_metadata_doc",
  "get_youtube_status",
];

function deps(overrides: Partial<ApiDeps> = {}): ApiDeps {
  return {
    store: new MemoryStore(),
    apiKey: API_KEY,
    encryptionKey: KEY,
    dailyQuota: 10000,
    youtubeMode: "mock",
    driveScope: "file",
    corsOrigin: "https://dev.yogeshkumarasamy.in",
    appPublicUrl: "https://dev.yogeshkumarasamy.in/yt-scheduler/",
    sha: "abc",
    environment: "preview",
    google: null,
    now: () => now,
    startUpload: async () => undefined,
    ...overrides,
  };
}

function call(ready: ApiDeps, url: string, init?: RequestInit) {
  return handleFetch(new Request(url, init), {} as Env, ctx, ready);
}

function mcp(ready: ApiDeps, url: string, body: unknown, headers: Record<string, string> = {}) {
  return call(ready, url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      host: new URL(url).host,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

async function rpc(response: Response): Promise<{ status: number; body: Record<string, unknown> }> {
  const text = await response.text();
  const jsonText = text.trim().startsWith("{")
    ? text
    : text.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).filter((line) => line && line !== "[DONE]").at(-1);
  return { status: response.status, body: JSON.parse(jsonText ?? text) as Record<string, unknown> };
}

function toolText(message: Record<string, unknown>): { status: number; body: Record<string, unknown> } {
  const result = message.result as { content?: { text?: string }[]; isError?: boolean } | undefined;
  const text = result?.content?.[0]?.text ?? "";
  return JSON.parse(text) as { status: number; body: Record<string, unknown> };
}

async function connect(ready: ApiDeps) {
  const response = await call(ready, `http://localhost/oauth/start?key=${API_KEY}`);
  expect(response.status).toBeGreaterThanOrEqual(300);
}

describe("mcp auth and tool list", () => {
  const url = "https://yt-scheduler-api.yogeshkumarasamy.in/mcp";
  const list = { jsonrpc: "2.0", id: 1, method: "tools/list" };

  it("rejects a missing or wrong key and accepts x-api-key or Authorization Bearer", async () => {
    const ready = deps();
    const missing = await rpc(await mcp(ready, url, list));
    expect(missing.status).toBe(401);
    expect(missing.body).toEqual({ error: "unauthorized" });

    const wrong = await rpc(await mcp(ready, url, list, { "x-api-key": "nope" }));
    expect(wrong.status).toBe(401);

    const header = await rpc(await mcp(ready, url, list, { "x-api-key": API_KEY }));
    expect(header.status).toBe(200);
    const bearer = await rpc(await mcp(ready, url, list, { authorization: `Bearer ${API_KEY}` }));
    expect(bearer.status).toBe(200);

    const names = ((header.body.result as { tools: { name: string }[] }).tools).map((tool) => tool.name);
    expect(names).toEqual(TOOLS);
    const listed = JSON.stringify(header.body);
    expect(listed).not.toMatch(/access-token|oauth\/start|oauth\/callback|google\/access-token/);
  });

  it("allows workers.dev preview hosts and rejects other hosts", async () => {
    const ready = deps();
    const preview = await rpc(await mcp(ready, "https://yt-scheduler-api-pr-9.coderdevelopment.workers.dev/mcp", list, { "x-api-key": API_KEY }));
    expect(preview.status).toBe(200);
    const local = await rpc(await mcp(ready, "http://127.0.0.1:8787/mcp", list, { "x-api-key": API_KEY }));
    expect(local.status).toBe(200);
    const blocked = await rpc(await mcp(ready, "https://evil.example/mcp", list, { "x-api-key": API_KEY }));
    expect(blocked.status).toBe(403);
    expect(blocked.body).toEqual({ error: "forbidden host" });
  });

  it("keeps /api on the API key header and /api/health open", async () => {
    const ready = deps();
    const health = await call(ready, "http://localhost/api/health");
    expect(health.status).toBe(200);
    const bearer = await call(ready, "http://localhost/api/jobs", { headers: { authorization: `Bearer ${API_KEY}` } });
    expect(bearer.status).toBe(401);
    const keyed = await call(ready, "http://localhost/api/jobs", { headers: { "x-api-key": API_KEY } });
    expect(keyed.status).toBe(200);
  });
});

describe("mcp tools/call", () => {
  it("creates a job, reads metadata, and reports YouTube status", async () => {
    const ready = deps();
    await connect(ready);
    const url = "http://localhost:8787/mcp";
    const headers = { "x-api-key": API_KEY };
    const created = await rpc(await mcp(ready, url, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "create_upload_job",
        arguments: {
          idempotencyKey: "ep-1",
          channel: "@mock",
          video: { driveFileId: "mockvideo01" },
          metadata: { title: "Episode", type: "long" },
          uploadMode: "now",
        },
      },
    }, headers));
    expect(created.status).toBe(200);
    const createdBody = toolText(created.body);
    expect(createdBody.status).toBe(201);
    const jobId = (createdBody.body.job as { id: string }).id;

    const doc = await rpc(await mcp(ready, url, {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "get_metadata_doc", arguments: { fileId: "mockmeta0001" } },
    }, headers));
    const docBody = toolText(doc.body);
    expect(docBody.status).toBe(200);
    expect(docBody.body.text).toContain("Mock episode");
    expect(docBody.body.mimeType).toBe("application/json");

    const missing = await rpc(await mcp(ready, url, {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "get_youtube_status", arguments: { id: jobId } },
    }, headers));
    const missingBody = toolText(missing.body);
    expect(missingBody.status).toBe(409);
    expect(missingBody.body.error).toBe("job has no youtubeVideoId yet");

    await ready.store.updateJob(jobId, { youtubeVideoId: "vid123" });
    const status = await rpc(await mcp(ready, url, {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "get_youtube_status", arguments: { id: jobId } },
    }, headers));
    const statusBody = toolText(status.body);
    expect(statusBody.status).toBe(200);
    expect(statusBody.body.id).toBe("vid123");
    expect(statusBody.body.status).toMatchObject({ uploadStatus: "processed", processingStatus: "succeeded" });
  });
});

describe("drive text and youtube status routes", () => {
  it("exports a Google Doc and reads a JSON sidecar in live mode", async () => {
    const store = new MemoryStore();
    const channel = await store.upsertChannel({
      youtubeChannelId: "UCdrivetoken1",
      handle: "@drive",
      title: "Real",
      refreshTokenEnc: "yt-enc",
      googleEmail: "owner@example.com",
      driveRefreshTokenEnc: "drive-enc",
      defaults: {},
      slots: DEFAULT_RULES,
    });
    const ready = deps({
      store,
      youtubeMode: "live",
      accessTokenFor: async (_channel, purpose = "youtube") => `access:${purpose}`,
    });
    const urls: string[] = [];
    const auths: string[] = [];
    const restore = stubFetch(async (input, init) => {
      const url = String(input);
      urls.push(url);
      auths.push(new Headers(init?.headers).get("authorization") ?? "");
      if (url.includes("/export")) return new Response("Episode title\nfrom the doc", { status: 200 });
      if (url.includes("alt=media")) return new Response('{"title":"Episode"}', { status: 200 });
      if (url.includes("/files/meta1")) return jsonResponse({ name: "metadata.json", mimeType: "application/json" });
      return jsonResponse({ name: "Episode notes", mimeType: "application/vnd.google-apps.document" });
    });
    try {
      const doc = await call(ready, `http://localhost/api/drive/text/doc1?channel=${channel.id}`, { headers: { "x-api-key": API_KEY } });
      expect(doc.status).toBe(200);
      expect(await doc.json()).toEqual({ fileId: "doc1", name: "Episode notes", mimeType: "application/vnd.google-apps.document", text: "Episode title\nfrom the doc" });
      const json = await call(ready, `http://localhost/api/drive/text/meta1?channel=${channel.id}`, { headers: { "x-api-key": API_KEY } });
      expect(json.status).toBe(200);
      expect(await json.json()).toMatchObject({ fileId: "meta1", mimeType: "application/json", text: '{"title":"Episode"}' });
    } finally {
      restore();
    }
    expect(urls.some((url) => url.includes("/export") && decodeURIComponent(url).includes("text/plain"))).toBe(true);
    expect(urls.some((url) => url.includes("alt=media"))).toBe(true);
    expect(auths.every((auth) => auth === "Bearer access:drive")).toBe(true);
  });

  it("calls videos.list with the YouTube token and 409s before an upload id exists", async () => {
    const store = new MemoryStore();
    const channel = await store.upsertChannel({
      youtubeChannelId: "UCdrivetoken2",
      handle: "@live",
      title: "Live",
      refreshTokenEnc: "yt-enc",
      googleEmail: "owner@example.com",
      driveRefreshTokenEnc: null,
      defaults: {},
      slots: DEFAULT_RULES,
    });
    const purposes: string[] = [];
    const ready = deps({
      store,
      youtubeMode: "live",
      accessTokenFor: async (_channel, purpose = "youtube") => {
        purposes.push(purpose);
        return `access:${purpose}`;
      },
    });
    const app = createApi(ready);
    const created = await app.request("/api/jobs", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify({ idempotencyKey: "live-1", channel: channel.id, video: { driveFileId: "mockvideo01" }, metadata: { title: "Live episode", type: "long" } }),
    });
    expect(created.status).toBe(201);
    const job = (await created.json() as { job: { id: string } }).job;
    const early = await app.request(`/api/jobs/${job.id}/youtube`, { headers: { "x-api-key": API_KEY } });
    expect(early.status).toBe(409);

    await store.updateJob(job.id, { youtubeVideoId: "vid999" });
    let authorization: string | null = null;
    const restore = stubFetch(async (input, init) => {
      authorization = new Headers(init?.headers).get("authorization");
      expect(String(input)).toContain("https://www.googleapis.com/youtube/v3/videos");
      expect(String(input)).toContain("part=snippet%2Cstatus");
      expect(String(input)).toContain("id=vid999");
      return jsonResponse({
        items: [{
          id: "vid999",
          snippet: { title: "Live episode", channelId: channel.youtubeChannelId },
          status: { privacyStatus: "private", publishAt: "2026-10-20T01:30:00Z", uploadStatus: "processed", processingStatus: "succeeded" },
        }],
      });
    });
    try {
      const status = await app.request(`/api/jobs/${job.id}/youtube`, { headers: { "x-api-key": API_KEY } });
      expect(status.status).toBe(200);
      expect(await status.json()).toMatchObject({
        id: "vid999",
        status: { privacyStatus: "private", publishAt: "2026-10-20T01:30:00Z", uploadStatus: "processed", processingStatus: "succeeded" },
      });
    } finally {
      restore();
    }
    expect(purposes).toEqual(["youtube"]);
    expect(authorization).toBe("Bearer access:youtube");
  });
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function stubFetch(impl: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  const original = globalThis.fetch;
  globalThis.fetch = impl as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}
