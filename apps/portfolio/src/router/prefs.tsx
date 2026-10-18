import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import type { Theme, PrefsApi } from "../contracts/os";

export type { Theme, PrefsApi };

const STORAGE_KEY_THEME = "yk-os-theme";
const STORAGE_KEY_CRT = "yk-os-crt";

const DEFAULT_THEME: Theme = "green";

export const PrefsContext = createContext<PrefsApi>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  crt: true,
  setCrt: () => {},
  reducedMotion: false,
});

function readStoredTheme(): Theme {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return DEFAULT_THEME;
    }
    const val = window.localStorage.getItem(STORAGE_KEY_THEME);
    if (val === "green" || val === "amber" || val === "light") {
      return val;
    }
  } catch {
    // Gracefully handle storage errors
  }
  return DEFAULT_THEME;
}

function readStoredCrt(reducedMotion: boolean): boolean {
  if (reducedMotion) return false;
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return true;
    }
    const val = window.localStorage.getItem(STORAGE_KEY_CRT);
    if (val !== null) {
      return val === "true" || val === "1" || val === "on";
    }
  } catch {
    // Gracefully handle storage errors
  }
  return true;
}

export const PrefsProvider: React.FC<{
  children: React.ReactNode;
  initialTheme?: Theme;
  initialCrt?: boolean;
}> = ({ children, initialTheme, initialCrt }) => {
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      return false;
    }
  });

  const [theme, setThemeState] = useState<Theme>(
    () => initialTheme ?? readStoredTheme(),
  );

  const [crt, setCrtState] = useState<boolean>(
    () => initialCrt ?? readStoredCrt(reducedMotion),
  );

  // Watch reduced-motion media query
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    try {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      const handler = (e: MediaQueryListEvent) => {
        setReducedMotion(e.matches);
        if (e.matches) {
          setCrtState(false);
        }
      };
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    } catch {
      return undefined;
    }
  }, []);

  // Sync theme to documentElement & localStorage
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      if (typeof window !== "undefined") {
        window.localStorage?.setItem(STORAGE_KEY_THEME, t);
      }
    } catch {
      // Storage failure handled
    }
  }, []);

  // Sync crt to documentElement & localStorage
  const setCrt = useCallback((on: boolean) => {
    setCrtState(on);
    try {
      if (typeof window !== "undefined") {
        window.localStorage?.setItem(STORAGE_KEY_CRT, on ? "on" : "off");
      }
    } catch {
      // Storage failure handled
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute(
      "data-crt",
      crt && !reducedMotion ? "on" : "off",
    );
  }, [crt, reducedMotion]);

  const value = useMemo<PrefsApi>(
    () => ({
      theme,
      setTheme,
      crt: crt && !reducedMotion,
      setCrt,
      reducedMotion,
    }),
    [theme, setTheme, crt, setCrt, reducedMotion],
  );

  return (
    <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
  );
};

export function usePrefs(): PrefsApi {
  return useContext(PrefsContext);
}
