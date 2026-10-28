/** Default public path for dev, staging, and local. Production sets APP_BASE=/. */
export const DEFAULT_APP_BASE = "/yt-scheduler/";

/**
 * Vite `base` / PWA scope. Absolute path with a trailing slash.
 * Previews set APP_BASE to `/preview/yt-scheduler/pr-<N>/`.
 */
export function normalizeAppBase(value = process.env.APP_BASE) {
  const raw = (value ?? "").trim() || DEFAULT_APP_BASE;
  if (!raw.startsWith("/")) {
    throw new Error(`APP_BASE must be an absolute path starting with /, got ${raw}`);
  }
  return raw.endsWith("/") ? raw : `${raw}/`;
}
