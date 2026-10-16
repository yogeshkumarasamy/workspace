import { createContext, useContext, useState, useEffect } from "react";
import type { OSApi, PrefsApi, Theme, AppId, WindowState } from "./types";

export const OSContext = createContext<OSApi | null>(null);
export const PrefsContext = createContext<PrefsApi | null>(null);

export function useOS(): OSApi {
  const context = useContext(OSContext);
  if (context) {
    return context;
  }

  // Fallback if not inside an OSProvider
  return {
    open: (appId: AppId) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("yk-os-open", { detail: { appId } }));
      }
    },
    close: (id: string) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("yk-os-close", { detail: { id } }));
      }
    },
    focus: (id: string) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("yk-os-focus", { detail: { id } }));
      }
    },
    windows: [],
  };
}

export function usePrefs(): PrefsApi {
  const context = useContext(PrefsContext);
  if (context) {
    return context;
  }

  // Safe fallback hook managing theme and CRT states locally
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("yk-theme") as Theme | null;
      if (stored === "green" || stored === "amber" || stored === "light") {
        return stored;
      }
      const docTheme = document.documentElement.dataset.theme as Theme | undefined;
      if (docTheme === "green" || docTheme === "amber" || docTheme === "light") {
        return docTheme;
      }
    }
    return "green";
  });

  const [crt, setCrtState] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("yk-crt");
      if (stored !== null) {
        return stored === "true" || stored === "on";
      }
      return document.documentElement.dataset.crt === "on";
    }
    return false;
  });

  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.dataset.theme = theme;
      try {
        localStorage.setItem("yk-theme", theme);
      } catch {
        // LocalStorage may fail in private mode
      }
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      document.documentElement.dataset.crt = crt ? "on" : "off";
      try {
        localStorage.setItem("yk-crt", crt ? "on" : "off");
      } catch {
        // LocalStorage may fail in private mode
      }
    }
  }, [crt]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
      const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
    return undefined;
  }, []);

  return {
    theme,
    setTheme: setThemeState,
    crt,
    setCrt: setCrtState,
    reducedMotion,
  };
}

export interface MockOSOptions {
  initialWindows?: WindowState[];
  onOpen?: (appId: AppId) => void;
  onClose?: (id: string) => void;
  onFocus?: (id: string) => void;
}

export function createMockOS(options: MockOSOptions = {}): OSApi {
  let windows: WindowState[] = options.initialWindows ? [...options.initialWindows] : [];

  return {
    get windows() {
      return windows;
    },
    open: (appId: AppId) => {
      options.onOpen?.(appId);
      const existing = windows.find((w) => w.appId === appId);
      if (existing) {
        existing.minimized = false;
        existing.z = Math.max(...windows.map((w) => w.z), 0) + 1;
      } else {
        const nextZ = Math.max(...windows.map((w) => w.z), 0) + 1;
        windows.push({
          id: `win-${appId}-${Date.now()}`,
          appId,
          x: 40,
          y: 40,
          w: 540,
          h: 400,
          z: nextZ,
          minimized: false,
          maximized: false,
        });
      }
    },
    close: (id: string) => {
      options.onClose?.(id);
      windows = windows.filter((w) => w.id !== id);
    },
    focus: (id: string) => {
      options.onFocus?.(id);
      const target = windows.find((w) => w.id === id);
      if (target) {
        target.minimized = false;
        target.z = Math.max(...windows.map((w) => w.z), 0) + 1;
      }
    },
  };
}
