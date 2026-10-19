import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import {
  loadAppConfig,
  getAppConfig,
  resolveApiBase,
  resetAppConfigForTesting,
} from "../src/runtime.ts";

test("innings-break-console runtime config", async (t) => {
  beforeEach(() => {
    resetAppConfigForTesting();
  });

  await t.test("loads config from app-config.json via fetch with cache: no-store", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;

    const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(
        JSON.stringify({
          env: "preview",
          apiBaseUrl: "https://ib-console-api-pr-42.acct.workers.dev",
          sha: "abc1234",
          pairedWith: "preview-api",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const config = await loadAppConfig("https://example.com/ib-console/", fakeFetch);
    assert.equal(capturedUrl, "https://example.com/ib-console/app-config.json");
    assert.equal(capturedInit?.cache, "no-store");
    assert.deepEqual(config, {
      env: "preview",
      apiBaseUrl: "https://ib-console-api-pr-42.acct.workers.dev",
      sha: "abc1234",
      pairedWith: "preview-api",
    });
    assert.deepEqual(getAppConfig(), config);
  });

  await t.test("falls back to VITE_API_BASE_URL when app-config.json fetch fails", async () => {
    const fakeFetch = (async () => {
      return new Response("Not Found", { status: 404 });
    }) as typeof fetch;

    const fallback = "https://local-dev-console-api.local";
    const config = await loadAppConfig("https://example.com/ib-console/", fakeFetch, fallback);
    assert.deepEqual(config, { apiBaseUrl: fallback });
    assert.equal(resolveApiBase(config, "https://example.com/ib-console/"), "https://local-dev-console-api.local/api/");
  });

  await t.test("resolves default same-origin api/ base when no config or fallback", () => {
    assert.equal(resolveApiBase(null, "https://example.com/ib-console/"), "https://example.com/ib-console/api/");
  });
});
