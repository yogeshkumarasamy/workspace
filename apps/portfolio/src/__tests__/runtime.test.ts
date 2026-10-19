import { describe, expect, it, beforeEach } from "vitest";
import {
  loadAppConfig,
  getAppConfig,
  resolveApiBase,
  resetAppConfigForTesting,
} from "../runtime";

describe("portfolio runtime config", () => {
  beforeEach(() => {
    resetAppConfigForTesting();
  });

  it("loads config from app-config.json via fetch with cache: no-store", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;

    const fakeFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(
        JSON.stringify({
          env: "preview",
          apiBaseUrl: "https://portfolio-api-pr-42.workers.dev",
          sha: "abc1234",
          pairedWith: "preview-api",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const config = await loadAppConfig("https://example.com/portfolio/", fakeFetch);
    expect(capturedUrl).toBe("https://example.com/portfolio/app-config.json");
    expect(capturedInit?.cache).toBe("no-store");
    expect(config).toEqual({
      env: "preview",
      apiBaseUrl: "https://portfolio-api-pr-42.workers.dev",
      sha: "abc1234",
      pairedWith: "preview-api",
    });
    expect(getAppConfig()).toEqual(config);
  });

  it("falls back to VITE_API_BASE_URL when app-config.json fetch fails", async () => {
    const fakeFetch = (async () => {
      return new Response("Not Found", { status: 404 });
    }) as typeof fetch;

    const fallback = "https://local-dev-api.local";
    const config = await loadAppConfig("https://example.com/portfolio/", fakeFetch, fallback);
    expect(config).toEqual({ apiBaseUrl: fallback });
    expect(resolveApiBase(config, "https://example.com/portfolio/")).toBe("https://local-dev-api.local/api/");
  });

  it("resolves api base with default same-origin api/ path when no config exists", () => {
    expect(resolveApiBase(null, "https://example.com/portfolio/")).toBe("https://example.com/portfolio/api/");
    expect(resolveApiBase({}, "https://example.com/portfolio/")).toBe("https://example.com/portfolio/api/");
  });

  it("resolves api base with configured URL preserving or adding trailing slash", () => {
    expect(
      resolveApiBase(
        { apiBaseUrl: "https://api.example.com" },
        "https://example.com/portfolio/",
      ),
    ).toBe("https://api.example.com/api/");
    expect(
      resolveApiBase(
        { apiBaseUrl: "https://api.example.com/v1" },
        "https://example.com/portfolio/",
      ),
    ).toBe("https://api.example.com/v1/");
  });
});
