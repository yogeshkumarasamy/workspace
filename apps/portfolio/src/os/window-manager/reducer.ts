import type {
  WindowAction,
  WindowManagerState,
  WindowState,
} from "./types";

export const CASCADE_BASE_X = 40;
export const CASCADE_BASE_Y = 40;
export const CASCADE_OFFSET = 28;
export const CASCADE_CYCLE = 8;

export const DEFAULT_WINDOW_WIDTH = 640;
export const DEFAULT_WINDOW_HEIGHT = 480;

/**
 * Constrains coordinates (x, y) so a window of (w, h) stays inside the viewport.
 */
export function clampToViewport(
  x: number,
  y: number,
  w: number,
  h: number,
  viewport?: { w: number; h: number },
): { x: number; y: number } {
  const vpWidth =
    viewport?.w ??
    (typeof window !== "undefined" && window.innerWidth > 0
      ? window.innerWidth
      : 1024);
  const vpHeight =
    viewport?.h ??
    (typeof window !== "undefined" && window.innerHeight > 0
      ? window.innerHeight
      : 768);

  const maxX = Math.max(0, vpWidth - w);
  const maxY = Math.max(0, vpHeight - h);

  const clampedX = Math.max(0, Math.min(x, maxX));
  const clampedY = Math.max(0, Math.min(y, maxY));

  return { x: clampedX, y: clampedY };
}

/**
 * Creates the initial WindowManagerState.
 */
export function createInitialState(
  initialWindows: WindowState[] = [],
): WindowManagerState {
  const topWindow = initialWindows.reduce<WindowState | null>((top, current) => {
    if (current.minimized) return top;
    if (!top || current.z > top.z) return current;
    return top;
  }, null);

  return {
    windows: [...initialWindows],
    cascadeCounter: initialWindows.length,
    focusedWindowId: topWindow ? topWindow.id : null,
  };
}

/**
 * Pure reducer handling window manager actions.
 */
export function windowManagerReducer(
  state: WindowManagerState,
  action: WindowAction,
): WindowManagerState {
  const maxZ = state.windows.reduce((max, w) => Math.max(max, w.z), 0);

  switch (action.type) {
    case "OPEN": {
      // Reopen focuses existing window if already open
      const existing = state.windows.find((w) => w.appId === action.appId);
      if (existing) {
        const nextZ = maxZ + 1;
        const updatedWindows = state.windows.map((w) =>
          w.id === existing.id
            ? { ...w, minimized: false, z: nextZ }
            : w,
        );
        return {
          ...state,
          windows: updatedWindows,
          focusedWindowId: existing.id,
        };
      }

      // New window creation with cascade placement
      const step = state.cascadeCounter % CASCADE_CYCLE;
      const rawX = CASCADE_BASE_X + step * CASCADE_OFFSET;
      const rawY = CASCADE_BASE_Y + step * CASCADE_OFFSET;

      const w = action.defaultSize?.w ?? DEFAULT_WINDOW_WIDTH;
      const h = action.defaultSize?.h ?? DEFAULT_WINDOW_HEIGHT;

      const { x, y } = clampToViewport(rawX, rawY, w, h);
      const nextZ = maxZ + 1;
      const id = `win-${action.appId}`;

      const newWindow: WindowState = {
        id,
        appId: action.appId,
        x,
        y,
        w,
        h,
        z: nextZ,
        minimized: false,
        maximized: false,
      };

      return {
        ...state,
        windows: [...state.windows, newWindow],
        cascadeCounter: state.cascadeCounter + 1,
        focusedWindowId: id,
      };
    }

    case "FOCUS": {
      const target = state.windows.find((w) => w.id === action.id);
      if (!target) return state;

      // If already highest z and not minimized, just ensure focusedWindowId is set
      if (target.z === maxZ && !target.minimized && state.focusedWindowId === target.id) {
        return state;
      }

      const nextZ = maxZ + 1;
      const updated = state.windows.map((w) =>
        w.id === action.id ? { ...w, z: nextZ, minimized: false } : w,
      );

      return {
        ...state,
        windows: updated,
        focusedWindowId: action.id,
      };
    }

    case "CLOSE": {
      const remaining = state.windows.filter((w) => w.id !== action.id);
      let nextFocused = state.focusedWindowId;

      if (state.focusedWindowId === action.id) {
        const topRemaining = remaining.reduce<WindowState | null>(
          (top, current) => {
            if (current.minimized) return top;
            if (!top || current.z > top.z) return current;
            return top;
          },
          null,
        );
        nextFocused = topRemaining ? topRemaining.id : null;
      }

      return {
        ...state,
        windows: remaining,
        focusedWindowId: nextFocused,
      };
    }

    case "MINIMIZE": {
      const target = state.windows.find((w) => w.id === action.id);
      if (!target) return state;

      const updated = state.windows.map((w) =>
        w.id === action.id ? { ...w, minimized: true } : w,
      );

      let nextFocused = state.focusedWindowId;
      if (state.focusedWindowId === action.id) {
        const topRemaining = updated.reduce<WindowState | null>(
          (top, current) => {
            if (current.minimized) return top;
            if (!top || current.z > top.z) return current;
            return top;
          },
          null,
        );
        nextFocused = topRemaining ? topRemaining.id : null;
      }

      return {
        ...state,
        windows: updated,
        focusedWindowId: nextFocused,
      };
    }

    case "MAXIMIZE": {
      const target = state.windows.find((w) => w.id === action.id);
      if (!target) return state;

      const nextZ = maxZ + 1;
      const willBeMaximized = !target.maximized;

      const updated = state.windows.map((w) =>
        w.id === action.id
          ? {
              ...w,
              maximized: willBeMaximized,
              minimized: false,
              z: nextZ,
            }
          : w,
      );

      return {
        ...state,
        windows: updated,
        focusedWindowId: action.id,
      };
    }

    case "RESTORE": {
      const target = state.windows.find((w) => w.id === action.id);
      if (!target) return state;

      const nextZ = maxZ + 1;
      const updated = state.windows.map((w) =>
        w.id === action.id
          ? { ...w, maximized: false, minimized: false, z: nextZ }
          : w,
      );

      return {
        ...state,
        windows: updated,
        focusedWindowId: action.id,
      };
    }

    case "MOVE": {
      const target = state.windows.find((w) => w.id === action.id);
      if (!target) return state;

      const updated = state.windows.map((w) =>
        w.id === action.id ? { ...w, x: action.x, y: action.y } : w,
      );

      return {
        ...state,
        windows: updated,
      };
    }

    case "RESIZE": {
      const target = state.windows.find((w) => w.id === action.id);
      if (!target) return state;

      const updated = state.windows.map((w) =>
        w.id === action.id ? { ...w, w: action.w, h: action.h } : w,
      );

      return {
        ...state,
        windows: updated,
      };
    }

    default:
      return state;
  }
}
