import { describe, expect, it, vi } from "vitest";
import { createJob } from "../src/jobs.js";
import { processJob, tick } from "../src/worker.js";
import { mockApi, seeded } from "./helpers.js";
import { createApp } from "../src/app.js";
import { draftJobsFromFolder } from "../src/drive-import.js";
import { DEFAULT_RULES } from "../src/slots.js";

const now = new Date("2026-10-14T02:00:00Z");
const raw = { idempotencyKey: "e1", channel: "@meeyazhpirai", video: { driveFileId: "1234567890abc" }, thumbnail: { driveFileId: "thumb1234567" }, metadata: { title: "Ep 1", type: "short" } };

describe("worker", () => {
  it("uploads, sets thumbnail, adds playlist, marks scheduled, tracks quota", async () => {
    const { store, ch } = await seeded();
    await createJob(raw, store, now);
    const api = mockApi();
    expect(await tick({ store, apiFor: () => api, dailyQuota: 10000, now: () => now })).toBe(1);
    const [j] = await store.listJobs({});
    expect(j!.status).toBe("scheduled");
    expect(j!.youtubeVideoId).toBe("vid123");
    expect(api.setThumbnail).toHaveBeenCalledWith("vid123", expect.anything());
    expect(api.addToPlaylist).toHaveBeenCalledWith("PLabcdefghijkl", "vid123");
    expect((await store.quotaUsed("2026-10-13")).byChannel[ch.id]).toBe(1701);
  });
  it("retries with backoff then fails after max attempts", async () => {
    const { store } = await seeded();
    const { job } = await createJob(raw, store, now);
    const api = mockApi({ insertVideo: vi.fn(async () => { throw Object.assign(new Error("socket hang up"), { code: 503 }); }) });
    let j = await processJob((await store.claimDue(now))!, { store, apiFor: () => api, dailyQuota: 1e6, now: () => now });
    expect(j.status).toBe("queued");
    expect(j.runAt.getTime()).toBeGreaterThan(now.getTime());
    for (let i = 0; i < 4; i++) j = await processJob({ ...(await store.getJob(job.id))!, status: "uploading" }, { store, apiFor: () => api, dailyQuota: 1e6, now: () => now });
    expect(j.status).toBe("failed");
    expect(j.attempts).toBe(5);
  });
  it("thumbnail failure is a warning, not a re-upload", async () => {
    const { store } = await seeded();
    await createJob(raw, store, now);
    const api = mockApi({ setThumbnail: vi.fn(async () => { throw new Error("forbidden"); }) });
    await tick({ store, apiFor: () => api, dailyQuota: 10000, now: () => now });
    const [j] = await store.listJobs({});
    expect(j!.status).toBe("scheduled");
    expect(j!.warnings.join()).toMatch(/thumbnail failed/);
  });
  it("defers to quota reset when budget exhausted", async () => {
    const { store, ch } = await seeded();
    await createJob(raw, store, now);
    await store.addQuota(ch.id, "2026-10-13", 9000);
    const api = mockApi();
    await tick({ store, apiFor: () => api, dailyQuota: 10000, now: () => now });
    const [j] = await store.listJobs({});
    expect(j!.status).toBe("queued");
    expect(api.insertVideo).not.toHaveBeenCalled();
    expect(j!.runAt.toISOString()).toBe("2026-10-14T07:05:00.000Z");
  });
});

describe("drive import", () => {
  it("builds jobs for episode + short subfolders", async () => {
    const tree: Record<string, { id: string; name: string; mimeType: string }[]> = {
      ep: [
        { id: "v1", name: "Ep 01.mp4", mimeType: "video/mp4" }, { id: "t1", name: "thumb.jpg", mimeType: "image/jpeg" },
        { id: "m1", name: "metadata.json", mimeType: "application/json" }, { id: "sf", name: "Short 01 - Hi", mimeType: "application/vnd.google-apps.folder" },
      ],
      sf: [{ id: "v2", name: "s.mp4", mimeType: "video/mp4" }, { id: "m2", name: "metadata.json", mimeType: "application/json" }],
    };
    const r = await draftJobsFromFolder({ list: async (id) => tree[id] ?? [], readText: async () => JSON.stringify({ title: "T" }), download: async () => { throw new Error("x"); } }, "ep", { channel: "UC1", recursive: true });
    expect(r.jobs).toHaveLength(2);
    expect(r.jobs[1]).toMatchObject({ idempotencyKey: "drive:v2", metadata: { type: "short" } });
    expect(r.jobs[0]).toMatchObject({ thumbnail: { driveFileId: "t1" }, metadata: { type: "long" } });
  });
});

describe("http api", () => {
  it("requires api key and supports bulk with per-item results", async () => {
    const { store } = await seeded();
    const app = createApp({
      store, apiKey: "secret", encryptionKey: Buffer.alloc(32).toString("base64"), dailyQuota: 10000, audited: false, defaultSlots: DEFAULT_RULES,
      oauth: { authUrl: () => "", exchange: async () => ({ refreshToken: "", email: null, channels: [] }) },
      worker: { store, apiFor: () => mockApi(), dailyQuota: 10000 }, driveFor: () => ({ list: async () => [], readText: async () => "", download: async () => { throw new Error("x"); } }),
    });
    expect((await app.request("/api/jobs")).status).toBe(401);
    const res = await app.request("/api/jobs", { method: "POST", headers: { "x-api-key": "secret", "content-type": "application/json" }, body: JSON.stringify({ jobs: [raw, { ...raw, channel: "@nope", idempotencyKey: "z" }] }) });
    const body = (await res.json()) as { results: { ok: boolean }[] };
    expect(body.results.map((r) => r.ok)).toEqual([true, false]);
    const q = await (await app.request("/api/quota", { headers: { "x-api-key": "secret" } })).json();
    expect(q).toMatchObject({ limit: 10000, uploadsLeftToday: 5 });
    expect(await (await app.request("/")).text()).toContain("Unverified API project");
  });
});
