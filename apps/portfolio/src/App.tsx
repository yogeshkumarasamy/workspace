import React, { useState, useEffect, useRef } from "react";
import { profile } from "./content/profile";
import { apps } from "./apps/registry";
import {
  useRoute,
  navigate,
  PrefsProvider,
  usePrefs,
  type Route,
} from "./router";
import { BootScreen } from "./os/boot";
import {
  WindowManagerProvider,
  WindowLayer,
  useOS as useWindowOS,
} from "./os/window-manager";
import { Desktop } from "./os/desktop";
import {
  OSContext as DesktopOSContext,
  PrefsContext as DesktopPrefsContext,
} from "./os/desktop/context";
import { ClassicView } from "./classic";

const RouteWindowOpener: React.FC<{ route: Route }> = ({ route }) => {
  const os = useWindowOS();
  const openedRef = useRef<string | null>(null);

  useEffect(() => {
    if (route.view === "app") {
      const alreadyOpen = os.windows.some((w) => w.appId === route.appId);
      if (!alreadyOpen || openedRef.current !== route.appId) {
        os.open(route.appId);
        openedRef.current = route.appId;
      }
    }
  }, [route, os]);

  return null;
};

const MobileBanner: React.FC = () => {
  return (
    <header role="banner" className="yk-mobile-banner">
      <span>Prefer a simpler view? Switch to </span>
      <a href="#/classic" className="yk-mobile-banner__link">
        Classic view
      </a>
    </header>
  );
};

const DesktopWorkspace: React.FC<{ route: Route }> = ({ route }) => {
  const os = useWindowOS();
  const prefs = usePrefs();

  return (
    <DesktopOSContext.Provider value={os}>
      <DesktopPrefsContext.Provider value={prefs}>
        <RouteWindowOpener route={route} />
        <MobileBanner />
        <Desktop
          apps={apps}
          os={os}
          prefs={prefs}
          onNavigate={(target) => navigate(target)}
        />
        <WindowLayer apps={apps} />
      </DesktopPrefsContext.Provider>
    </DesktopOSContext.Provider>
  );
};

const Shell: React.FC = () => {
  const route = useRoute();
  const prefs = usePrefs();
  const [bootDone, setBootDone] = useState(false);

  // Classic view route (#/classic) bypasses boot completely (PRD §6, §8)
  if (route.view === "classic") {
    return <ClassicView profile={profile} />;
  }

  return (
    <div className={`yk-os-root ${prefs.crt ? "yk-crt" : ""}`}>
      {!bootDone && (
        <BootScreen
          onDone={() => {
            setBootDone(true);
          }}
        />
      )}
      <WindowManagerProvider apps={apps}>
        <DesktopWorkspace route={route} />
      </WindowManagerProvider>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <PrefsProvider>
      <Shell />
    </PrefsProvider>
  );
};

export default App;
