import { useEffect, useState } from "react";
import type { Route } from "../contracts/os";
import type { AppId } from "../contracts/apps";

export type { Route };

export function parseHash(hash: string): Route {
  const cleanHash = hash.startsWith("#") ? hash.slice(1) : hash;
  const path = cleanHash.startsWith("/") ? cleanHash : `/${cleanHash}`;

  if (path === "/classic") {
    return { view: "classic" };
  }

  const appMatch = path.match(/^\/app\/([a-zA-Z0-9_-]+)$/);
  if (appMatch && appMatch[1]) {
    return { view: "app", appId: appMatch[1] as AppId };
  }

  return { view: "desktop" };
}

export function routeToHash(route: Route): string {
  if (route.view === "classic") {
    return "#/classic";
  }
  if (route.view === "app") {
    return `#/app/${route.appId}`;
  }
  return "#/";
}

export function navigate(route: Route | string): void {
  if (typeof window === "undefined") return;

  if (typeof route === "string") {
    if (route.startsWith("#")) {
      window.location.hash = route;
    } else {
      window.location.hash = `#${route.startsWith("/") ? route : `/${route}`}`;
    }
  } else {
    window.location.hash = routeToHash(route);
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => {
    if (typeof window === "undefined") {
      return { view: "desktop" };
    }
    return parseHash(window.location.hash);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onHashChange = () => {
      setRoute(parseHash(window.location.hash));
    };

    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  return route;
}

export { PrefsProvider, usePrefs } from "./prefs";
