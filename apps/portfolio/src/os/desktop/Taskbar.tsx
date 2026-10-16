import React, { useState, useEffect, useRef, useMemo } from "react";
import type { AppDefinition, OSApi, PrefsApi, Theme, WindowState } from "./types";
import { StartMenu } from "./StartMenu";

export interface TaskbarProps {
  apps: AppDefinition[];
  os: OSApi;
  prefs: PrefsApi;
  onNavigate?: (path: string) => void;
}

export const THEME_CYCLE: Theme[] = ["green", "amber", "light"];

export const Taskbar: React.FC<TaskbarProps> = ({
  apps,
  os,
  prefs,
  onNavigate,
}) => {
  const [isStartOpen, setIsStartOpen] = useState<boolean>(false);
  const startButtonRef = useRef<HTMLButtonElement>(null);

  // Time in Asia/Kolkata timezone
  const [timeString, setTimeString] = useState<string>(() => {
    try {
      return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(new Date());
    } catch {
      return new Date().toLocaleTimeString();
    }
  });

  const [dateTooltip, setDateTooltip] = useState<string>(() => {
    try {
      return new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "full",
        timeStyle: "medium",
      }).format(new Date());
    } catch {
      return new Date().toLocaleString();
    }
  });

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      try {
        setTimeString(
          new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          }).format(now),
        );
        setDateTooltip(
          new Intl.DateTimeFormat("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "full",
            timeStyle: "medium",
          }).format(now),
        );
      } catch {
        setTimeString(now.toLocaleTimeString());
        setDateTooltip(now.toLocaleString());
      }
    };

    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCycleTheme = () => {
    const currentIndex = THEME_CYCLE.indexOf(prefs.theme);
    const nextTheme = THEME_CYCLE[(currentIndex + 1) % THEME_CYCLE.length];
    prefs.setTheme(nextTheme);
  };

  const handleToggleCrt = () => {
    prefs.setCrt(!prefs.crt);
  };

  const handleWindowClick = (window: WindowState) => {
    // If the window is currently active and not minimized, clicking it minimizes it
    const isCurrentlyActive = window.id === activeWindowId && !window.minimized;
    if (isCurrentlyActive && typeof os.minimize === "function") {
      os.minimize(window.id);
    } else {
      os.focus(window.id);
    }
  };

  // Find active window ID (highest z among non-minimized)
  const activeWindowId = useMemo(() => {
    const active = os.windows
      .filter((w) => !w.minimized)
      .sort((a, b) => b.z - a.z)[0];
    return active ? active.id : null;
  }, [os.windows]);

  // App map for fast lookup of icons and titles
  const appMap = useMemo(() => {
    const map = new Map<string, AppDefinition>();
    for (const app of apps) {
      map.set(app.id, app);
    }
    return map;
  }, [apps]);

  return (
    <footer
      className="yk-taskbar"
      role="toolbar"
      aria-label="Desktop taskbar"
      data-testid="desktop-taskbar"
    >
      <div className="yk-taskbar__start-group">
        <button
          type="button"
          ref={startButtonRef}
          className={`yk-taskbar__start-btn ${isStartOpen ? "yk-taskbar__start-btn--active" : ""}`}
          onClick={() => setIsStartOpen((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setIsStartOpen(true);
            }
          }}
          aria-haspopup="menu"
          aria-expanded={isStartOpen}
          aria-controls="yk-start-menu"
          aria-label="Start menu"
          data-testid="start-button"
        >
          <span className="yk-taskbar__start-logo" aria-hidden="true">
            💻
          </span>
          <span className="yk-taskbar__start-text">Start</span>
        </button>

        <StartMenu
          isOpen={isStartOpen}
          onClose={() => setIsStartOpen(false)}
          apps={apps}
          os={os}
          onNavigate={onNavigate}
          triggerRef={startButtonRef}
        />
      </div>

      {/* List of open windows */}
      <div
        className="yk-taskbar__windows"
        role="group"
        aria-label="Open application windows"
        data-testid="taskbar-windows-list"
      >
        {os.windows.map((win) => {
          const appDef = appMap.get(win.appId);
          const title = appDef ? appDef.title : win.appId;
          const icon = appDef ? appDef.icon : "🪟";
          const isActive = win.id === activeWindowId && !win.minimized;

          return (
            <button
              key={win.id}
              type="button"
              className={`yk-taskbar__window-btn ${isActive ? "yk-taskbar__window-btn--active" : ""} ${win.minimized ? "yk-taskbar__window-btn--minimized" : ""}`}
              onClick={() => handleWindowClick(win)}
              aria-pressed={isActive}
              aria-label={`${title}${win.minimized ? " (minimized)" : isActive ? " (active)" : ""}`}
              data-testid={`taskbar-window-${win.id}`}
              data-window-id={win.id}
            >
              <span className="yk-taskbar__window-icon" aria-hidden="true">
                {icon}
              </span>
              <span className="yk-taskbar__window-title">{title}</span>
            </button>
          );
        })}
      </div>

      {/* System Tray Controls */}
      <div
        className="yk-taskbar__tray"
        role="group"
        aria-label="System status and controls"
      >
        {/* Theme Toggle */}
        <button
          type="button"
          className="yk-taskbar__tray-btn yk-taskbar__tray-btn--theme"
          onClick={handleCycleTheme}
          aria-label={`Current theme: ${prefs.theme}. Click to switch theme`}
          title={`Theme: ${prefs.theme} (Click to switch)`}
          data-testid="theme-toggle-btn"
        >
          <span className="yk-taskbar__tray-icon" aria-hidden="true">
            🎨
          </span>
          <span className="yk-taskbar__tray-text">{prefs.theme}</span>
        </button>

        {/* CRT Toggle */}
        <button
          type="button"
          className={`yk-taskbar__tray-btn yk-taskbar__tray-btn--crt ${prefs.crt ? "yk-taskbar__tray-btn--active" : ""}`}
          onClick={handleToggleCrt}
          aria-pressed={prefs.crt}
          aria-label={`CRT scanlines effect: ${prefs.crt ? "enabled" : "disabled"}. Click to toggle`}
          title={`CRT effect: ${prefs.crt ? "ON" : "OFF"}`}
          data-testid="crt-toggle-btn"
        >
          <span className="yk-taskbar__tray-icon" aria-hidden="true">
            📺
          </span>
          <span className="yk-taskbar__tray-text">CRT: {prefs.crt ? "ON" : "OFF"}</span>
        </button>

        {/* Clock */}
        <div
          className="yk-taskbar__clock"
          role="timer"
          aria-label={`Current time in Chennai, Asia/Kolkata: ${timeString}`}
          title={`Asia/Kolkata (IST): ${dateTooltip}`}
          data-testid="taskbar-clock"
        >
          <time dateTime={new Date().toISOString()}>{timeString}</time>
        </div>
      </div>
    </footer>
  );
};
