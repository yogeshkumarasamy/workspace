import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { WindowProps } from "./types";
import { useWindowManager } from "./context";
import { clampToViewport } from "./reducer";
import "./window-manager.css";

const KEYBOARD_STEP = 16;
const KEYBOARD_STEP_FAST = 48;

export const Window: React.FC<WindowProps> = ({
  state,
  title,
  children,
  icon,
  onClose: propClose,
  onFocus: propFocus,
  onMinimize: propMinimize,
  onMaximize: propMaximize,
  className = "",
}) => {
  const os = useWindowManager();
  const windowRef = useRef<HTMLDivElement>(null);
  const titlebarRef = useRef<HTMLDivElement>(null);
  const triggerElementRef = useRef<HTMLElement | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const dragStartRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Keep a reference to the triggering element to return focus on close
  useEffect(() => {
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      triggerElementRef.current = document.activeElement;
    }

    // Move focus into window on open (WCAG 2.2 AA)
    const timer = setTimeout(() => {
      if (titlebarRef.current) {
        titlebarRef.current.focus();
      } else if (windowRef.current) {
        windowRef.current.focus();
      }
    }, 10);

    return () => {
      clearTimeout(timer);
      // Return focus to triggering element when window unmounts/closes
      if (
        triggerElementRef.current &&
        typeof triggerElementRef.current.focus === "function" &&
        document.body.contains(triggerElementRef.current)
      ) {
        triggerElementRef.current.focus();
      }
    };
  }, []);

  // Move focus into window when it becomes the active/focused window
  const isTopFocused = os.focusedWindowId === state.id && !state.minimized;
  useEffect(() => {
    if (isTopFocused) {
      if (
        windowRef.current &&
        !windowRef.current.contains(document.activeElement)
      ) {
        titlebarRef.current?.focus();
      }
    }
  }, [isTopFocused]);

  const handleClose = useCallback(() => {
    if (propClose) {
      propClose(state.id);
    } else {
      os.close(state.id);
    }
  }, [propClose, os, state.id]);

  const handleFocus = useCallback(() => {
    if (propFocus) {
      propFocus(state.id);
    } else {
      os.focus(state.id);
    }
  }, [propFocus, os, state.id]);

  const handleMinimize = useCallback(() => {
    if (propMinimize) {
      propMinimize(state.id);
    } else {
      os.minimize(state.id);
    }
  }, [propMinimize, os, state.id]);

  const handleMaximize = useCallback(() => {
    if (propMaximize) {
      propMaximize(state.id);
    } else {
      os.maximize(state.id);
    }
  }, [propMaximize, os, state.id]);

  // Pointer drag implementation (constrained to viewport, no third-party libraries)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary button
    if (e.button !== 0) return;

    // Do not initiate drag when clicking titlebar buttons
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;

    // Mobile (< 768px) and Maximized windows cannot be dragged
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (isMobile || state.maximized) {
      handleFocus();
      return;
    }

    handleFocus();

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // In testing environments without pointer capture support
    }

    dragStartRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: state.x,
      origY: state.y,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    if (dragStartRef.current.pointerId !== e.pointerId) return;

    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    const rawX = dragStartRef.current.origX + deltaX;
    const rawY = dragStartRef.current.origY + deltaY;

    const clamped = clampToViewport(rawX, rawY, state.w, state.h);
    os.move(state.id, clamped.x, clamped.y);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current && dragStartRef.current.pointerId === e.pointerId) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Safe fallback
      }
      dragStartRef.current = null;
      setIsDragging(false);
    }
  };

  // Keyboard move mode (M key to enter, arrow keys to move, Enter to exit, Esc to cancel/close)
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

    if (!isMoveMode) {
      if ((e.key === "m" || e.key === "M") && !isMobile && !state.maximized) {
        e.preventDefault();
        setIsMoveMode(true);
        setAnnouncement(
          `Move mode enabled for ${title}. Use arrow keys to reposition window. Press Enter to confirm.`,
        );
      }
      return;
    }

    // In Move Mode
    const step = e.shiftKey ? KEYBOARD_STEP_FAST : KEYBOARD_STEP;

    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const clamped = clampToViewport(state.x - step, state.y, state.w, state.h);
      os.move(state.id, clamped.x, clamped.y);
      setAnnouncement(`Position: ${clamped.x}, ${clamped.y}`);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      const clamped = clampToViewport(state.x + step, state.y, state.w, state.h);
      os.move(state.id, clamped.x, clamped.y);
      setAnnouncement(`Position: ${clamped.x}, ${clamped.y}`);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const clamped = clampToViewport(state.x, state.y - step, state.w, state.h);
      os.move(state.id, clamped.x, clamped.y);
      setAnnouncement(`Position: ${clamped.x}, ${clamped.y}`);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const clamped = clampToViewport(state.x, state.y + step, state.w, state.h);
      os.move(state.id, clamped.x, clamped.y);
      setAnnouncement(`Position: ${clamped.x}, ${clamped.y}`);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsMoveMode(false);
      setAnnouncement(`Window repositioned at ${state.x}, ${state.y}. Move mode exited.`);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setIsMoveMode(false);
      setAnnouncement("Move mode cancelled.");
    }
  };

  // Window-level key handling: Escape closes window (PRD §8)
  const handleWindowKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      if (isMoveMode) {
        // Handled in titlebar key handler, but catch here if bubble
        setIsMoveMode(false);
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      handleClose();
    }
  };

  const isActive = os.focusedWindowId === state.id;
  const titleId = `yk-win-title-${state.id}`;

  const style: React.CSSProperties = {
    transform: `translate(${state.x}px, ${state.y}px)`,
    width: `${state.w}px`,
    height: `${state.h}px`,
    zIndex: state.z,
  };

  const windowClasses = [
    "yk-window",
    isActive ? "yk-window--active" : "yk-window--inactive",
    state.minimized ? "yk-window--minimized" : "",
    state.maximized ? "yk-window--maximized" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const titlebarClasses = [
    "yk-window__titlebar",
    isDragging ? "yk-window__titlebar--dragging" : "",
    isMoveMode ? "yk-window__titlebar--move-mode" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={windowRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      data-window-id={state.id}
      data-app-id={state.appId}
      data-testid={`window-${state.appId}`}
      tabIndex={-1}
      className={windowClasses}
      style={style}
      hidden={state.minimized}
      aria-hidden={state.minimized}
      onPointerDown={handleFocus}
      onKeyDown={handleWindowKeyDown}
    >
      {/* Live region for screen-reader announcements */}
      <div className="yk-window__sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Window Titlebar */}
      <div
        ref={titlebarRef}
        role="region"
        tabIndex={0}
        aria-label={`${title} title bar. ${isMoveMode ? "Move mode active. Use arrow keys to move, Enter to finish." : "Press M to enter move mode."}`}
        data-testid="window-titlebar"
        data-move-mode={isMoveMode ? "true" : "false"}
        className={titlebarClasses}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleTitleKeyDown}
        onDoubleClick={handleMaximize}
      >
        <div className="yk-window__title-group">
          {icon && (
            <span className="yk-window__icon" aria-hidden="true">
              {icon}
            </span>
          )}
          <span id={titleId} className="yk-window__title-text">
            {title}
          </span>
        </div>

        <div className="yk-window__controls">
          {/* Minimize Button */}
          <button
            type="button"
            className="yk-window__btn yk-window__btn--minimize"
            aria-label={`Minimize ${title}`}
            data-testid="window-btn-minimize"
            onClick={(e) => {
              e.stopPropagation();
              handleMinimize();
            }}
          >
            _
          </button>

          {/* Maximize / Restore Button */}
          <button
            type="button"
            className="yk-window__btn yk-window__btn--maximize"
            aria-label={state.maximized ? `Restore ${title}` : `Maximize ${title}`}
            data-testid="window-btn-maximize"
            onClick={(e) => {
              e.stopPropagation();
              handleMaximize();
            }}
          >
            {state.maximized ? "❐" : "□"}
          </button>

          {/* Close Button */}
          <button
            type="button"
            className="yk-window__btn yk-window__btn--close"
            aria-label={`Close ${title}`}
            data-testid="window-btn-close"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Window Content */}
      <div
        className="yk-window__content"
        data-testid="window-content"
        role="region"
        aria-label={`${title} content`}
      >
        {children}
      </div>
    </div>
  );
};
