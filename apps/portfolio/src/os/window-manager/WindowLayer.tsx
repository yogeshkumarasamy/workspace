import React, { Suspense, useMemo } from "react";
import type { AppDefinition, AppId, WindowLayerProps } from "./types";
import { useOS, useRegisteredApps } from "./context";
import { Window } from "./Window";
import "./window-manager.css";

export const WindowLayer: React.FC<WindowLayerProps> = ({
  apps,
  getApp,
  className = "",
}) => {
  const os = useOS();
  const registeredApps = useRegisteredApps();

  const appsLookup = useMemo(() => {
    if (getApp) return getApp;

    if (Array.isArray(apps)) {
      const map = new Map<AppId, AppDefinition>();
      for (const app of apps) {
        map.set(app.id, app);
      }
      return (id: AppId) => map.get(id);
    }

    if (apps && typeof apps === "object") {
      const record = apps as Record<string, AppDefinition>;
      return (id: AppId) => record[id];
    }

    return (id: AppId) => registeredApps.get(id);
  }, [apps, getApp, registeredApps]);

  return (
    <div
      className={`yk-window-layer ${className}`.trim()}
      data-testid="yk-window-layer"
      aria-label="Window Layer"
    >
      {os.windows.map((win) => {
        const app = appsLookup(win.appId);
        const title = app?.title ?? win.appId;
        const icon = app?.icon;
        const AppComponent = app?.component;

        return (
          <Window
            key={win.id}
            state={win}
            title={title}
            icon={icon}
          >
            {AppComponent ? (
              <Suspense
                fallback={
                  <div
                    className="yk-window__loading"
                    aria-live="polite"
                    data-testid="window-loading"
                  >
                    Loading...
                  </div>
                }
              >
                <AppComponent windowId={win.id} />
              </Suspense>
            ) : null}
          </Window>
        );
      })}
    </div>
  );
};
