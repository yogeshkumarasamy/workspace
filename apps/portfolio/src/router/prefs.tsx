import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { PrefsApi, Theme } from "../contracts/os";

const THEME_STORAGE_KEY = "yk-theme";
const CRT_STORAGE_KEY = "yk-crt";

const VALID_THEMES: readonly Theme[] = ["green", "amber", "light"] as const;

function isTheme(val: unknown): val is Theme {
  return typeof val === "string" && VALID_THEMES.includes(val as Theme);
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "green";
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // localStorage may be disabled / private mode
  }
  return "green";
}

function getInitialCrt(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(CRT_STORAGE_KEY);
    if (stored === "off" || stored === "false" || stored === "0") return false;
    if (stored === "on" || stored === "true" || stored === "1") return true;
  } catch {
    // localStorage may be disabled
  }
  return true;
}

function getInitialReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

const PrefsContext = createContext<PrefsApi | null>(null);

export interface PrefsProviderProps {
  children: React.ReactNode;
  initialTheme?: Theme;
  initialCrt?: boolean;
}

export function PrefsProvider({
  children,
  initialTheme,
  initialCrt,
}: PrefsProviderProps): React.ReactElement {
  const [theme, setThemeState] = useState<Theme>(
    () => initialTheme ?? getInitialTheme()
  );
  const [crtPref, setCrtPref] = useState<boolean>(
    () => initialCrt ?? getInitialCrt()
  );
  const [reducedMotion, setReducedMotion] = useState<boolean>(
    getInitialReducedMotion
  );

  // Sync reducedMotion with media query changes
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    try {
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mql.matches);

      const handler = (e: MediaQueryListEvent | MediaQueryList) => {
        setReducedMotion(e.matches);
      };

      if (mql.addEventListener) {
        mql.addEventListener("change", handler as (e: MediaQueryListEvent) => void);
        return () =>
          mql.removeEventListener(
            "change",
            handler as (e: MediaQueryListEvent) => void
          );
      } else if ("addListener" in mql) {
        // Fallback for older browsers
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mql as any).addListener(handler);
        return () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (mql as any).removeListener(handler);
        };
      }
    } catch {
      // Ignore media query listener errors
    }
    return undefined;
  }, []);

  const setTheme = (newTheme: Theme) => {
    if (!VALID_THEMES.includes(newTheme)) return;
    setThemeState(newTheme);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // Ignore storage failure
    }
  };

  const setCrt = (on: boolean) => {
    setCrtPref(on);
    try {
      window.localStorage.setItem(CRT_STORAGE_KEY, on ? "on" : "off");
    } catch {
      // Ignore storage failure
    }
  };

  // CRT is disabled when reduced motion is requested
  const effectiveCrt = reducedMotion ? false : crtPref;

  // Sync DOM attributes on <html>: data-theme and data-crt
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.setAttribute(
      "data-crt",
      effectiveCrt ? "on" : "off"
    );
  }, [theme, effectiveCrt]);

  const value = useMemo<PrefsApi>(
    () => ({
      theme,
      setTheme,
      crt: effectiveCrt,
      setCrt,
      reducedMotion,
    }),
    [theme, effectiveCrt, reducedMotion]
  );

  return (
    <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
  );
}

export function usePrefs(): PrefsApi {
  const ctx = useContext(PrefsContext);
  if (!ctx) {
    throw new Error("usePrefs must be used within a PrefsProvider");
  }
  return ctx;
}
