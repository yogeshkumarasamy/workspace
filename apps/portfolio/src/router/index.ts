import { useEffect, useState } from "react";
import type { Route } from "../contracts/os";
import type { AppId } from "../contracts/apps";

export type { Route };

/**
 * Directory the hash router is mounted at. Hash routes stay in the fragment
 * (`#/classic`); this is the pathname before the hash. Vite `base` is the
 * same path with a trailing slash (`/portfolio/` or a preview path).
 */
export function routerBasename(baseUrl = "/portfolio/"): string {
  if (!baseUrl || baseUrl === "/" || baseUrl === "./") return "/";
  return baseUrl.replace(/\/$/, "");
}

export const basename = routerBasename(import.meta.env.BASE_URL || "/portfolio/");

/**
 * Classic sections that have a desktop window. Bare hashes such as `#projects`
 * used to fall through to the desktop route, which always selected About.txt.
 */
const SECTION_APP: Record<string, AppId> = {
  about: "about",
  experience: "experience",
  projects: "projects",
  writing: "writing",
  contact: "contact",
  terminal: "terminal",
};

/** In-page classic anchors. These must stay on the classic view. */
const CLASSIC_ANCHORS = new Set([
  "skills",
  "education",
  "certifications",
  "classic-content",
]);

export function parseHash(hash: string): Route {
  const cleanHash = hash.startsWith("#") ? hash.slice(1) : hash;
  const path = cleanHash.startsWith("/") ? cleanHash : `/${cleanHash}`;

  if (path === "/classic" || path.startsWith("/classic/")) {
    return { view: "classic" };
  }

  const appMatch = path.match(/^\/app\/([a-zA-Z0-9_-]+)$/);
  if (appMatch && appMatch[1]) {
    return { view: "app", appId: appMatch[1] as AppId };
  }

  const bare = path.slice(1);
  if (CLASSIC_ANCHORS.has(bare)) {
    return { view: "classic" };
  }

  const sectionApp = SECTION_APP[bare];
  if (sectionApp) {
    return { view: "app", appId: sectionApp };
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
