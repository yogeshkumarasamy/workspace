import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { DEFAULT_RULES } from "../src/slots.js";
import { mockApi, seeded } from "./helpers.js";

describe("PWA static serving", () => {
  it("serves sw.js no-cache, manifest with manifest mime, SPA fallback, never for /api", async () => {
    const dir = mkdtempSync(join(tmpdir(), "web-"));
    mkdirSync(join(dir, "assets")); mkdirSync(join(dir, "icons"));
    mkdirSync(join(dir, "privacy")); mkdirSync(join(dir, "terms"));
    writeFileSync(join(dir, "index.html"), "<html>spa</html>");
    writeFileSync(join(dir, "privacy", "index.html"), "<!doctype html><title>Privacy</title><p>privacy-body</p>");
    writeFileSync(join(dir, "terms", "index.html"), "<!doctype html><title>Terms</title><p>terms-body</p>");
    writeFileSync(join(dir, "sw.js"), "self.x=1");
    writeFileSync(join(dir, "manifest.webmanifest"), "{}");
    writeFileSync(join(dir, "assets", "a.js"), "1");
    writeFileSync(join(dir, "icons", "icon-192.png"), "png");
    writeFileSync(join(dir, "app-config.json"), JSON.stringify({ apiBaseUrl: "https://yt-scheduler-api-dev.acct.workers.dev" }));
    const { store } = await seeded();
    const app = createApp({
      store, apiKey: "k", encryptionKey: Buffer.alloc(32).toString("base64"), dailyQuota: 10000, audited: false, defaultSlots: DEFAULT_RULES, webDir: dir,
      oauth: { authUrl: () => "", exchange: async () => ({ refreshToken: "", email: null, channels: [] }) },
      worker: { store, apiFor: () => mockApi(), dailyQuota: 10000 },
      driveFor: () => ({ list: async () => [], readText: async () => "", download: async () => { throw new Error("x"); } }),
    });
    const sw = await app.request("/sw.js");
    expect(sw.status).toBe(200);
    expect(sw.headers.get("cache-control")).toMatch(/no-cache/);
    expect(sw.headers.get("content-type")).toMatch(/javascript/);
    const mf = await app.request("/manifest.webmanifest");
    expect(mf.headers.get("content-type")).toBe("application/manifest+json");
    expect(mf.headers.get("cache-control")).toMatch(/no-cache/);
    expect((await app.request("/assets/a.js")).headers.get("cache-control")).toMatch(/immutable/);
    expect((await app.request("/icons/icon-192.png")).status).toBe(200);
    expect(await (await app.request("/calendar/deep")).text()).toContain("spa");
    expect((await app.request("/")).headers.get("cache-control")).toBe("no-cache");
    expect((await app.request("/api/nope")).status).toBe(401);
    expect((await app.request("/yt-scheduler/assets/a.js")).headers.get("cache-control")).toMatch(/immutable/);
    expect((await app.request("/yt-scheduler/icons/icon-192.png")).status).toBe(200);
    expect((await app.request("/yt-scheduler/sw.js")).headers.get("service-worker-allowed")).toBe("/yt-scheduler/");
    expect(await (await app.request("/yt-scheduler/jobs")).text()).toContain("spa");
    for (const [url, marker] of [
      ["/privacy", "privacy-body"],
      ["/privacy/", "privacy-body"],
      ["/yt-scheduler/privacy", "privacy-body"],
      ["/yt-scheduler/privacy/", "privacy-body"],
      ["/terms", "terms-body"],
      ["/yt-scheduler/terms/", "terms-body"],
    ] as const) {
      const page = await app.request(url);
      expect(page.status, url).toBe(200);
      expect(page.headers.get("content-type"), url).toMatch(/text\/html/);
      expect(await page.text(), url).toContain(marker);
      expect(await (await app.request(url)).text(), url).not.toContain(">spa<");
    }
    expect((await app.request("/yt-scheduler/")).headers.get("cache-control")).toBe("no-cache");
    expect((await app.request("/yt-scheduler/api/nope")).status).toBe(401);
    expect((await app.request("/yt-scheduler/api/config")).status).toBe(200);
    expect((await app.request("/yt-scheduler/oauth/start")).status).toBe(401);
    expect((await app.request("/oauth/start")).status).toBe(401);
    const cfg = await app.request("/yt-scheduler/app-config.json");
    expect(cfg.status).toBe(200);
    expect(cfg.headers.get("content-type")).toMatch(/json/);
    expect(cfg.headers.get("cache-control")).toMatch(/no-store/);
    expect(await cfg.json()).toEqual({ apiBaseUrl: "https://yt-scheduler-api-dev.acct.workers.dev" });
    expect((await app.request("/yt-scheduler/missing.json")).status).toBe(404);
  });
});
