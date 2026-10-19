/**
 * Runtime config loader for Innings Break (Team Manager app).
 * Loads app-config.json before rendering, and falls back to
 * import.meta.env.VITE_API_BASE_URL (local dev / MSW).
 */

export interface AppConfig {
  env?: string;
  apiBaseUrl?: string;
  sha?: string;
  pairedWith?: string;
  [key: string]: unknown;
}

const CONFIG_FIELDS = ["env", "apiBaseUrl", "sha", "pairedWith"] as const;

let cachedConfig: AppConfig | null = null;

export function resolveApiBase(
  config: AppConfig | null | undefined,
  baseURI: string = typeof document !== "undefined" ? document.baseURI : "http://localhost/",
  fallbackUrl?: string,
): string {
  const envFallback =
    fallbackUrl ??
    (typeof import.meta !== "undefined" && (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE_URL
      ? String((import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE_URL).trim()
      : undefined);

  const configured = config?.apiBaseUrl?.trim() || envFallback?.trim();
  if (!configured) return new URL("api/", baseURI).href;
  const url = new URL(configured);
  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = path === "" ? "/api/" : `${path}/`;
  url.search = "";
  url.hash = "";
  return url.href;
}

export async function loadAppConfig(
  baseURI: string = typeof document !== "undefined" ? document.baseURI : "http://localhost/",
  fetchImpl: typeof fetch = fetch,
  envFallback?: string,
): Promise<AppConfig | null> {
  let config: AppConfig | null = null;
  try {
    const res = await fetchImpl(new URL("app-config.json", baseURI), { cache: "no-store" });
    if (res.ok) {
      const body = (await res.json()) as Record<string, unknown>;
      if (body && typeof body === "object") {
        config = {};
        for (const field of CONFIG_FIELDS) {
          const value = body[field];
          if (typeof value === "string" && value.trim()) {
            config[field] = value.trim();
          }
        }
      }
    }
  } catch {
    // network or parse error, fallback follows
  }

  const fallback =
    envFallback ??
    (typeof import.meta !== "undefined" && (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE_URL
      ? String((import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE_URL).trim()
      : undefined);

  if (fallback && (!config || !config.apiBaseUrl)) {
    config = { ...(config ?? {}), apiBaseUrl: fallback };
  }

  cachedConfig = config;
  return config;
}

export function getAppConfig(): AppConfig | null {
  return cachedConfig;
}

export function resetAppConfigForTesting(): void {
  cachedConfig = null;
}
