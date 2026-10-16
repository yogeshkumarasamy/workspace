import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import type {
  AppDefinition,
  AppId,
  OSApi,
  WindowManagerApi,
  WindowManagerProviderProps,
} from "./types";
import {
  createInitialState,
  windowManagerReducer,
} from "./reducer";

export const WindowManagerContext = createContext<WindowManagerApi | null>(null);
export const AppsRegistryContext = createContext<Map<AppId, AppDefinition> | null>(null);

const DEFAULT_OS_API: OSApi = {
  open: () => {},
  close: () => {},
  focus: () => {},
  windows: [],
};

/**
 * Access the core OS API conforming to PRD §13.1 (open, close, focus, windows).
 */
export function useOS(): OSApi {
  const ctx = useContext(WindowManagerContext);
  return ctx || DEFAULT_OS_API;
}

/**
 * Access the full WindowManager API with minimize, maximize, restore, move, and focusedWindowId.
 */
export function useWindowManager(): WindowManagerApi {
  const ctx = useContext(WindowManagerContext);
  if (!ctx) {
    return {
      ...DEFAULT_OS_API,
      minimize: () => {},
      maximize: () => {},
      restore: () => {},
      move: () => {},
      resize: () => {},
      focusedWindowId: null,
    };
  }
  return ctx;
}

/**
 * Access registered AppDefinitions if provided to the provider.
 */
export function useRegisteredApps(): Map<AppId, AppDefinition> {
  const ctx = useContext(AppsRegistryContext);
  return ctx || new Map();
}

/**
 * WindowManagerProvider manages all open windows and provides OSApi to the component tree.
 */
export const WindowManagerProvider: React.FC<WindowManagerProviderProps> = ({
  children,
  apps,
  initialWindows = [],
}) => {
  const [state, dispatch] = useReducer(
    windowManagerReducer,
    initialWindows,
    createInitialState,
  );

  const appsMap = useMemo(() => {
    const map = new Map<AppId, AppDefinition>();
    if (Array.isArray(apps)) {
      for (const app of apps) {
        map.set(app.id, app);
      }
    } else if (apps && typeof apps === "object") {
      for (const [key, val] of Object.entries(apps)) {
        map.set(key as AppId, val);
      }
    }
    return map;
  }, [apps]);

  const open = useCallback(
    (appId: AppId) => {
      const app = appsMap.get(appId);
      dispatch({
        type: "OPEN",
        appId,
        defaultSize: app?.defaultSize,
      });
    },
    [appsMap],
  );

  const close = useCallback((id: string) => {
    dispatch({ type: "CLOSE", id });
  }, []);

  const focus = useCallback((id: string) => {
    dispatch({ type: "FOCUS", id });
  }, []);

  const minimize = useCallback((id: string) => {
    dispatch({ type: "MINIMIZE", id });
  }, []);

  const maximize = useCallback((id: string) => {
    dispatch({ type: "MAXIMIZE", id });
  }, []);

  const restore = useCallback((id: string) => {
    dispatch({ type: "RESTORE", id });
  }, []);

  const move = useCallback((id: string, x: number, y: number) => {
    dispatch({ type: "MOVE", id, x, y });
  }, []);

  const resize = useCallback((id: string, w: number, h: number) => {
    dispatch({ type: "RESIZE", id, w, h });
  }, []);

  const api: WindowManagerApi = useMemo(
    () => ({
      open,
      close,
      focus,
      windows: state.windows,
      minimize,
      maximize,
      restore,
      move,
      resize,
      focusedWindowId: state.focusedWindowId,
    }),
    [
      open,
      close,
      focus,
      state.windows,
      minimize,
      maximize,
      restore,
      move,
      resize,
      state.focusedWindowId,
    ],
  );

  return (
    <WindowManagerContext.Provider value={api}>
      <AppsRegistryContext.Provider value={appsMap}>
        {children}
      </AppsRegistryContext.Provider>
    </WindowManagerContext.Provider>
  );
};
