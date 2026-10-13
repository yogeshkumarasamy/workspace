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
    writeFileSync(join(dir, "index.html"), "<html>spa</html>");
    writeFileSync(join(dir, "sw.js"), "self.x=1");
    writeFileSync(join(dir, "manifest.webmanifest"), "{}");
    writeFileSync(join(dir, "assets", "a.js"), "1");
    writeFileSync(join(dir, "icons", "icon-192.png"), "png");
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
  });
});
