import React from "react";
import type { DesktopProps } from "./types";
import { useOS, usePrefs } from "./context";
import { DesktopGrid } from "./DesktopGrid";
import { Taskbar } from "./Taskbar";
import "./desktop.css";

export const Desktop: React.FC<DesktopProps> = ({
  apps,
  os: propOs,
  prefs: propPrefs,
  onNavigate,
  initialSelectedId,
  banner,
  children,
}) => {
  // Use hooks from context if props are not explicitly provided
  const contextOs = useOS();
  const contextPrefs = usePrefs();

  const os = propOs || contextOs;
  const prefs = propPrefs || contextPrefs;

  return (
    <div
      className="yk-desktop"
      data-testid="yk-desktop"
      data-theme={prefs.theme}
      data-crt={prefs.crt ? "on" : "off"}
    >
      {/* Skip link for screen-reader & keyboard users (WCAG 2.2 AA) */}
      <a
        href="#/classic"
        className="yk-desktop__skip-link"
        onClick={(e) => {
          if (onNavigate) {
            e.preventDefault();
            onNavigate("#/classic");
          }
        }}
      >
        Skip to Classic view
      </a>

      {banner}

      {/* Main desktop surface with icon grid */}
      <main className="yk-desktop__surface" aria-label="Desktop Surface">
        <DesktopGrid
          apps={apps}
          os={os}
          onNavigate={onNavigate}
          initialSelectedId={initialSelectedId}
        />
      </main>

      {children}

      {/* Taskbar & Start Menu */}
      <Taskbar apps={apps} os={os} prefs={prefs} onNavigate={onNavigate} />
    </div>
  );
};

export default Desktop;
