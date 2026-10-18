/** Runtime wiring for the static UI. Pure so tests can call it without a browser. */

export interface AppConfig {
  apiBaseUrl?: string;
  /** Present on mock environments so the preview can sign in. Never set in production. */
  apiKey?: string;
  youtubeMode?: string;
  googleClientId?: string;
  pickerApiKey?: string;
  driveScope?: string;
}

const CONFIG_FIELDS = ["apiBaseUrl", "apiKey", "youtubeMode", "googleClientId", "pickerApiKey", "driveScope"] as const;

export function routerBasename(baseUrl: string): string {
  if (!baseUrl || baseUrl === "/" || baseUrl === "./") return "/";
  return baseUrl.replace(/\/$/, "");
}

/**
 * Directory that API paths (`channels`, `jobs/…`) are resolved against.
 * A Workers `apiBaseUrl` is used as given. An origin with no path
 * (`https://yt-scheduler-api-dev.example.workers.dev`) means the current
 * `/api` routes, so `/api/` is appended. When `apiBaseUrl` is absent, the
 * base is `new URL("api/", baseURI)` (same-origin, under the page base).
 */
export function resolveApiBase(config: AppConfig | null | undefined, baseURI: string): string {
  const configured = config?.apiBaseUrl?.trim();
  if (!configured) return new URL("api/", baseURI).href;
  const url = new URL(configured);
  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = path === "" ? "/api/" : `${path}/`;
  url.search = "";
  url.hash = "";
  return url.href;
}

export function apiUrl(apiBase: string, path: string): string {
  const relative = path.replace(/^\//, "");
  const root = apiBase.endsWith("/") ? apiBase : `${apiBase}/`;
  return new URL(relative, root).href;
}

/** OAuth is a top-level `/oauth/start` on the API origin, or under the page base when same-origin. */
export function resolveOauthStart(config: AppConfig | null | undefined, baseURI: string, key: string, extra = ""): string {
  const configured = config?.apiBaseUrl?.trim();
  const start = configured
    ? new URL("/oauth/start", `${new URL(configured).origin}/`)
    : new URL("oauth/start", baseURI);
  start.searchParams.set("key", key);
  const extraParams = new URLSearchParams(extra.replace(/^[?&]/, ""));
  extraParams.forEach((value, name) => start.searchParams.set(name, value));
  return start.href;
}

export async function loadAppConfig(baseURI: string, fetchImpl: typeof fetch = fetch): Promise<AppConfig | null> {
  try {
    const res = await fetchImpl(new URL("app-config.json", baseURI), { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as Record<string, unknown>;
    if (!body || typeof body !== "object") return null;
    const config: AppConfig = {};
    for (const field of CONFIG_FIELDS) {
      const value = body[field];
      if (typeof value === "string" && value.trim()) config[field] = value.trim();
    }
    return config;
  } catch {
    return null;
  }
}
