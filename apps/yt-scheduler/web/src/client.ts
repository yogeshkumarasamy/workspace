import { apiUrl, loadAppConfig, resolveApiBase, resolveOauthStart } from "./runtime";
import type { AppConfig } from "./runtime";

let pending: Promise<string> | null = null;
let apiBase = "";
let config: AppConfig | null = null;
let baseURI = "";

/** Load app-config.json once. Returns the API base used for later fetches. */
export function initRuntime(documentBase = document.baseURI): Promise<string> {
  if (!pending) {
    baseURI = documentBase;
    pending = loadAppConfig(documentBase).then((loaded) => {
      config = loaded;
      apiBase = resolveApiBase(loaded, documentBase);
      return apiBase;
    });
  }
  return pending;
}

export function oauthStartUrl(key: string, extra = ""): string {
  return resolveOauthStart(config, baseURI || document.baseURI, key, extra);
}

export function getRuntimeConfig(): AppConfig | null {
  return config;
}

export { apiUrl };
