import { describe, expect, it } from "vitest";
import { createJob } from "../src/jobs.js";
import { bulkAction, ConflictError, editJob, rescheduleJob } from "../src/manage.js";
import { createApp } from "../src/app.js";
import { DEFAULT_RULES } from "../src/slots.js";
import { tick } from "../src/worker.js";
import { mockApi, seeded } from "./helpers.js";

const now = new Date("2026-10-14T02:00:00Z");
const raw = { idempotencyKey: "e1", channel: "@meeyazhpirai", video: { driveFileId: "1234567890abc" }, metadata: { title: "Ep 1", type: "long" } };

describe("manage", () => {
  it("edits a queued job and re-validates", async () => {
    const { store } = await seeded();
    const { job } = await createJob(raw, store, now);
    const api = mockApi();
    const e = await editJob(job.id, { metadata: { title: "Ep 1 (new)", tags: ["a"] } }, { store, apiFor: () => api, now: () => now });
    expect(e.metadata.title).toBe("Ep 1 (new)");
    expect(e.log.at(-1)!.msg).toBe("edited");
    await expect(editJob(job.id, { metadata: { title: "x".repeat(101) } }, { store, apiFor: () => api, now: () => now })).rejects.toThrow(/invalid/);
  });
  it("reschedules locally before upload, via videos.update after", async () => {
    const { store } = await seeded();
    const { job } = await createJob(raw, store, now);
    const api = mockApi();
    const d = { store, apiFor: () => api, now: () => now };
    await rescheduleJob(job.id, new Date("2026-10-30T12:30:00Z"), d);
    expect(api.updateSchedule).not.toHaveBeenCalled();
    await tick({ store, apiFor: () => api, dailyQuota: 1e5, now: () => now });
    expect((await store.getJob(job.id))!.status).toBe("scheduled");
    const r = await rescheduleJob(job.id, new Date("2026-11-01T12:30:00Z"), d);
    expect(api.updateSchedule).toHaveBeenCalledWith("vid123", expect.objectContaining({ publishAt: "2026-11-01T12:30:00.000Z" }), expect.any(Date));
    expect(r.publishAt!.toISOString()).toBe("2026-11-01T12:30:00.000Z");
    await expect(rescheduleJob(job.id, new Date("2026-10-01T00:00:00Z"), d)).rejects.toThrow(/future/);
    await expect(editJob(job.id, { metadata: { title: "no" } }, d)).rejects.toBeInstanceOf(ConflictError);
  });
  it("bulk cancel/retry/autoslot", async () => {
    const { store } = await seeded();
    const a = (await createJob(raw, store, now)).job;
    const b = (await createJob({ ...raw, idempotencyKey: "e2" }, store, now)).job;
    const d = { store, apiFor: () => mockApi(), now: () => now };
    expect((await bulkAction({ ids: [a.id, b.id], action: "cancel" }, d)).every((r) => r.ok)).toBe(true);
    expect((await bulkAction({ ids: [a.id, "nope"], action: "retry" }, d)).map((r) => r.ok)).toEqual([true, false]);
    const r = await bulkAction({ ids: [a.id], action: "autoslot" }, d);
    expect(r[0]!.ok).toBe(true);
  });
});

describe("http manage endpoints", () => {
  it("bulk, reschedule, playlists, drive list", async () => {
    const { store, ch } = await seeded();
    const { job } = await createJob(raw, store, now);
    const api = mockApi();
    const app = createApp({
      store, apiKey: "k", encryptionKey: Buffer.alloc(32).toString("base64"), dailyQuota: 10000, audited: false, defaultSlots: DEFAULT_RULES,
      oauth: { authUrl: () => "", exchange: async () => ({ refreshToken: "", email: null, channels: [] }) },
      worker: { store, apiFor: () => api, dailyQuota: 10000 },
      driveFor: () => ({ list: async () => [{ id: "f", name: "b.mp4", mimeType: "video/mp4" }, { id: "d", name: "Ep 01", mimeType: "application/vnd.google-apps.folder" }], readText: async () => "", download: async () => { throw new Error("x"); } }),
    });
    const h = { "x-api-key": "k", "content-type": "application/json" };
    const rs = await app.request(`/api/jobs/${job.id}/reschedule`, { method: "POST", headers: h, body: JSON.stringify({ publishAt: "2030-01-01T00:00:00Z" }) });
    expect(rs.status).toBe(200);
    const pl = await (await app.request(`/api/channels/${ch.id}/playlists`, { headers: h })).json();
    expect(pl[0].title).toBe("Meeyazh & Pirai Shorts");
    const dl = (await (await app.request(`/api/drive/list`, { headers: h })).json()) as { name: string }[];
    expect(dl[0]!.name).toBe("Ep 01");
    expect((await app.request(`/api/jobs/nope/reschedule`, { method: "POST", headers: h, body: JSON.stringify({ publishAt: "2030-01-01T00:00:00Z" }) })).status).toBe(404);
    expect((await (await app.request("/api/config")).json()).audited).toBe(false);
  });
});
