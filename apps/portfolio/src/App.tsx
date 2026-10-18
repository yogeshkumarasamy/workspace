import React, { useState, useEffect } from "react";
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
  const appId = route.view === "app" ? route.appId : null;
  const open = os.open;

  useEffect(() => {
    if (!appId) return;
    // `open` focuses an existing window. Keying this on the app id — not the
    // OS object — keeps the hashed app in front instead of About.txt, which
    // is the first desktop icon and used to win whenever the hash was not an
    // `/app/<id>` route.
    open(appId);
  }, [appId, open]);

  return null;
};

const MobileBanner: React.FC = () => {
  return (
    <header role="banner" className="yk-mobile-banner">
      <span className="yk-mobile-banner__text">Prefer a simpler view?</span>
      <a href="#/classic" className="yk-mobile-banner__link">
        Switch to Classic view
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
        <Desktop
          apps={apps}
          os={os}
          prefs={prefs}
          banner={<MobileBanner />}
          initialSelectedId={route.view === "app" ? route.appId : undefined}
          onNavigate={(target) => navigate(target)}
        >
          <WindowLayer apps={apps} />
        </Desktop>
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
    <div className="yk-os-root">
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
      {prefs.crt && (
        <div className="yk-crt" aria-hidden="true" data-testid="yk-crt" />
      )}
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
