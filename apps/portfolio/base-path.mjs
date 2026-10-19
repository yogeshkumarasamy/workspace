/** Default public path on dev, staging, and production. */
export const DEFAULT_APP_BASE = "/portfolio/";

/**
 * Vite `base`. Absolute path with a trailing slash.
 * Previews set APP_BASE to `/preview/portfolio/pr-<N>/`.
 */
export function normalizeAppBase(value = process.env.APP_BASE) {
  let raw = (value ?? "").trim() || DEFAULT_APP_BASE;
  if (raw.includes("<app>") || raw.includes("<slug>")) {
    raw = raw.replace(/<(app|slug)>/g, "portfolio");
  }
  if (!raw.startsWith("/")) {
    throw new Error(`APP_BASE must be an absolute path starting with /, got ${raw}`);
  }
  return raw.endsWith("/") ? raw : `${raw}/`;
}

/** React-style basename: the site path without the trailing slash. */
export function routerBasename(value = process.env.APP_BASE) {
  const base = normalizeAppBase(value);
  return base === "/" ? "/" : base.replace(/\/$/, "");
}
