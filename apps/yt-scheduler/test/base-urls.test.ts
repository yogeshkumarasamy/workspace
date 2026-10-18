import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkDist, urlsOutsideBase } from "../scripts/check-base-urls.mjs";
import { apiUrl, loadAppConfig, resolveApiBase, resolveOauthStart, routerBasename } from "../web/src/runtime.js";

const BASE = "/yt-scheduler/";
const PAGE = "https://dev.yogeshkumarasamy.in/yt-scheduler/";
const PREVIEW = "https://dev.yogeshkumarasamy.in/previews/yt-scheduler/pr-23/";

describe("static base URLs", () => {
  it("allows asset URLs under the configured base and rejects domain-root ones", () => {
    const html = `<script src="/yt-scheduler/assets/index-abc.js"></script><link href="/yt-scheduler/icons/favicon-32.png">`;
    expect(urlsOutsideBase(html, BASE)).toEqual([]);
    const manifest = JSON.stringify({
      id: "/",
      scope: "/",
      start_url: "/?source=pwa",
      icons: [{ src: "/icons/icon-192.png" }],
    });
    expect(urlsOutsideBase(manifest, BASE)).toEqual(["/", "/", "/?source=pwa", "/icons/icon-192.png"]);
  });

  it("accepts a preview base and fails the check when the manifest is still rooted at /", () => {
    const preview = "/previews/yt-scheduler/pr-23/";
    const html = `<link href="${preview}assets/a.js">`;
    expect(urlsOutsideBase(html, preview)).toEqual([]);
    const dir = mkdtempSync(join(tmpdir(), "yt-dist-"));
    writeFileSync(join(dir, "index.html"), `<script src="${preview}assets/a.js"></script>`);
    writeFileSync(join(dir, "manifest.webmanifest"), JSON.stringify({ scope: preview, start_url: preview, icons: [{ src: `${preview}icons/icon-192.png` }] }));
    expect(checkDist(dir, preview)).toEqual([]);
    writeFileSync(join(dir, "manifest.webmanifest"), JSON.stringify({ scope: "/", start_url: preview }));
    expect(checkDist(dir, preview).flatMap((problem) => problem.urls)).toContain("/");
  });
});

describe("API base", () => {
  it("falls back to api/ under the document base", () => {
    expect(resolveApiBase(null, PAGE)).toBe("https://dev.yogeshkumarasamy.in/yt-scheduler/api/");
    expect(resolveApiBase({}, PREVIEW)).toBe("https://dev.yogeshkumarasamy.in/previews/yt-scheduler/pr-23/api/");
    expect(resolveApiBase({ apiBaseUrl: "  " }, PAGE)).toBe("https://dev.yogeshkumarasamy.in/yt-scheduler/api/");
  });

  it("uses a Workers apiBaseUrl and still sends paths under /api", () => {
    const origin = "https://yt-scheduler-api-dev.acct.workers.dev";
    expect(resolveApiBase({ apiBaseUrl: origin }, PAGE)).toBe(`${origin}/api/`);
    expect(resolveApiBase({ apiBaseUrl: `${origin}/api` }, PAGE)).toBe(`${origin}/api/`);
    expect(apiUrl(`${origin}/api/`, "/channels")).toBe(`${origin}/api/channels`);
    expect(apiUrl(`${origin}/api/`, "/drive/file/abc?channel=ch")).toBe(`${origin}/api/drive/file/abc?channel=ch`);
  });

  it("points OAuth at the Workers origin, or under the page base when same-origin", () => {
    expect(resolveOauthStart({ apiBaseUrl: "https://yt-scheduler-api.acct.workers.dev/api" }, PAGE, "secret", "&purpose=drive&channelId=c1"))
      .toBe("https://yt-scheduler-api.acct.workers.dev/oauth/start?key=secret&purpose=drive&channelId=c1");
    expect(resolveOauthStart(null, PAGE, "secret")).toBe("https://dev.yogeshkumarasamy.in/yt-scheduler/oauth/start?key=secret");
  });

  it("keeps public app-config fields and drops anything that is not a string", async () => {
    const body = {
      apiBaseUrl: "https://yt-scheduler-api-pr-9.coderdevelopment.workers.dev",
      apiKey: "preview-pr-9",
      youtubeMode: "mock",
      driveScope: "file",
      googleClientId: "123.apps.googleusercontent.com",
      clientSecret: "nope",
    };
    const fetchImpl = (async () => new Response(JSON.stringify(body), { status: 200 })) as typeof fetch;
    const config = await loadAppConfig(PAGE, fetchImpl);
    expect(config).toEqual({
      apiBaseUrl: body.apiBaseUrl,
      apiKey: "preview-pr-9",
      youtubeMode: "mock",
      driveScope: "file",
      googleClientId: "123.apps.googleusercontent.com",
    });
  });

  it("strips the trailing slash for the history basename", () => {
    expect(routerBasename("/yt-scheduler/")).toBe("/yt-scheduler");
    expect(routerBasename("/previews/yt-scheduler/pr-9/")).toBe("/previews/yt-scheduler/pr-9");
    expect(routerBasename("/")).toBe("/");
  });
});
