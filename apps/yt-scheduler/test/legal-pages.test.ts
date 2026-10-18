import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vite";
import { describe, expect, it } from "vitest";
import { contactMarkup, readLegalContact, renderLegalHtml, stampDist } from "../legal-pages.mjs";
import { checkLegalPages } from "../scripts/check-base-urls.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "/yt-scheduler/";

describe("legal pages", () => {
  it("shows the GitHub profile and no invented email", () => {
    const contact = readLegalContact(root);
    expect(contact.contactEmail).toBe("");
    expect(contact.contactUrl).toBe("https://github.com/yogeshkumarasamy");
    const html = contactMarkup(contact);
    expect(html).toContain("github.com/yogeshkumarasamy");
    expect(html).not.toContain("mailto:");
    const preview = renderLegalHtml('<a href="__APP_BASE__privacy">__CONTACT__</a>', "/preview/yt-scheduler/pr-4/", contact);
    expect(preview).toContain('href="/preview/yt-scheduler/pr-4/privacy"');
    expect(preview).not.toContain("__");
  });

  it("built dist contains crawlable privacy and terms pages", async () => {
    const previousBase = process.env.APP_BASE;
    const previousPwa = process.env.VITE_PWA;
    process.env.APP_BASE = BASE;
    process.env.VITE_PWA = "off";
    const outDir = mkdtempSync(path.join(tmpdir(), "yt-legal-"));
    try {
      await build({
        configFile: path.join(root, "vite.config.ts"),
        build: { outDir, emptyOutDir: true },
        logLevel: "error",
      });
      stampDist(outDir, BASE, root);
      expect(checkLegalPages(outDir, BASE)).toEqual([]);
      const privacy = readFileSync(path.join(outDir, "privacy/index.html"), "utf8");
      const terms = readFileSync(path.join(outDir, "terms/index.html"), "utf8");
      const home = readFileSync(path.join(outDir, "index.html"), "utf8");
      for (const html of [privacy, terms]) {
        expect(html).not.toMatch(/<script[\s>]/i);
        expect(html).not.toContain("__");
        expect(html).toContain("Yogesh Kumarasamy");
        expect(html).toContain('href="/yt-scheduler/"');
        expect(html).toContain('href="/yt-scheduler/privacy"');
        expect(html).toContain('href="/yt-scheduler/terms"');
        expect(html).toContain("github.com/yogeshkumarasamy");
        expect(html).toContain("https://www.youtube.com/t/terms");
        expect(html).toContain("https://policies.google.com/privacy");
        expect(html).not.toContain("mailto:");
      }
      expect(privacy).toContain("https://www.googleapis.com/auth/youtube");
      expect(privacy).toContain("https://www.googleapis.com/auth/youtube.upload");
      expect(privacy).toContain("https://www.googleapis.com/auth/drive.file");
      expect(privacy).toContain("openid");
      expect(privacy).toContain("email");
      expect(privacy).toContain("Cloudflare D1");
      expect(privacy).toContain("https://myaccount.google.com/permissions");
      expect(privacy).toContain("Disconnecting deletes the stored tokens");
      expect(privacy).toContain("Limited Use requirements");
      expect(privacy).toContain("https://developers.google.com/terms/api-services-user-data-policy");
      expect(privacy).toContain("does not show ads");
      expect(home).toContain('href="/yt-scheduler/privacy"');
      expect(home).toContain('href="/yt-scheduler/terms"');
      expect(home).toContain("single-owner");
      expect(home).not.toContain("__CONTACT__");
      expect(home).not.toContain("%BASE_URL%");
    } finally {
      if (previousBase === undefined) delete process.env.APP_BASE;
      else process.env.APP_BASE = previousBase;
      if (previousPwa === undefined) delete process.env.VITE_PWA;
      else process.env.VITE_PWA = previousPwa;
      rmSync(outDir, { recursive: true, force: true });
    }
  }, 120_000);
});
