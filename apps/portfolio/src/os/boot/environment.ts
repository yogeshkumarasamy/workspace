export const BOOT_STORAGE_KEY = "yk-booted";

export interface BootEnvironment {
  reducedMotion: boolean;
  alreadyBooted: boolean;
  webdriver: boolean;
}

interface PageLike {
  matchMedia?: (query: string) => { matches: boolean };
  sessionStorage?: Pick<Storage, "getItem" | "setItem">;
  navigator?: { webdriver?: boolean };
}

function page(): PageLike | null {
  const candidate = (globalThis as { window?: PageLike }).window;
  return candidate ?? null;
}

export function readAlreadyBooted(
  storage: Pick<Storage, "getItem"> | null | undefined,
): boolean {
  if (!storage) return false;
  try {
    const value = storage.getItem(BOOT_STORAGE_KEY);
    return typeof value === "string" && value.length > 0;
  } catch {
    // sessionStorage can throw when access is blocked.
    return false;
  }
}

export function persistBooted(
  storage: Pick<Storage, "setItem"> | null | undefined,
): void {
  if (!storage) return;
  try {
    storage.setItem(BOOT_STORAGE_KEY, "1");
  } catch {
    // Ignore quota and privacy-mode failures. The in-memory run still ends.
  }
}

export function prefersReducedMotion(
  matchMediaFn: ((query: string) => { matches: boolean }) | undefined,
): boolean {
  if (!matchMediaFn) return false;
  try {
    return matchMediaFn("(prefers-reduced-motion: reduce)").matches === true;
  } catch {
    return false;
  }
}

export function readBootEnvironment(): BootEnvironment {
  const current = page();
  if (!current) {
    return { reducedMotion: false, alreadyBooted: false, webdriver: false };
  }
  return {
    reducedMotion: prefersReducedMotion(current.matchMedia),
    alreadyBooted: readAlreadyBooted(current.sessionStorage),
    webdriver: current.navigator?.webdriver === true,
  };
}

export function shouldSkipBoot(env: BootEnvironment): boolean {
  return env.reducedMotion || env.alreadyBooted || env.webdriver;
}

export function sessionStorageFromPage(): Pick<Storage, "getItem" | "setItem"> | null {
  const current = page();
  if (!current) return null;
  try {
    return current.sessionStorage ?? null;
  } catch {
    return null;
  }
}
