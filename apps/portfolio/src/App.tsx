import React, { useEffect, useState } from "react";
import "./styles/index.css";
import { profile } from "./content";
import { BootScreen } from "./os/boot";
import { WindowManagerProvider, useOS } from "./os/window-manager";
import { Desktop } from "./os/desktop";
import { ClassicView } from "./classic";
import { apps } from "./apps/registry";
import { useRoute } from "./router";
import { PrefsProvider, usePrefs } from "./router/prefs";
import type { Route } from "./contracts/os";

function AppRouteSync({ route }: { route: Route }): null {
  const os = useOS();

  useEffect(() => {
    if (route.view === "app") {
      os.open(route.appId);
    }
  }, [route, os]);

  return null;
}

export function AppContent(): React.ReactElement {
  const route = useRoute();
  const prefs = usePrefs();

  const [bootDone, setBootDone] = useState<boolean>(() => {
    if (prefs.reducedMotion) return true;
    if (typeof window !== "undefined") {
      try {
        return sessionStorage.getItem("yk-boot-done") === "1";
      } catch {
        return true;
      }
    }
    return true;
  });

  const handleBootDone = () => {
    try {
      sessionStorage.setItem("yk-boot-done", "1");
    } catch {
      // localStorage/sessionStorage failures handled safely
    }
    setBootDone(true);
  };

  // Classic view: plain semantic page, never shows boot screen
  if (route.view === "classic") {
    return (
      <div className="yk-app-root">
        <ClassicView profile={profile} />
      </div>
    );
  }

  // BIOS boot sequence: skippable, once per session, skipped on reduced motion
  if (!bootDone) {
    return (
      <div className="yk-app-root">
        <BootScreen onDone={handleBootDone} />
      </div>
    );
  }

  // Desktop OS environment
  return (
    <div className="yk-app-root">
      <a href="#/classic" className="yk-skip-link">
        Skip to Classic view
      </a>
      <WindowManagerProvider>
        <AppRouteSync route={route} />
        <Desktop apps={apps} />
      </WindowManagerProvider>
    </div>
  );
}

export function App(): React.ReactElement {
  return (
    <PrefsProvider>
      <AppContent />
    </PrefsProvider>
  );
}

export default App;
