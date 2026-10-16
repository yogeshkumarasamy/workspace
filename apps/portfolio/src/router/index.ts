import { useEffect, useState } from "react";
import type { AppId } from "../contracts/apps";
import type { Route } from "../contracts/os";

const VALID_APP_IDS: readonly AppId[] = [
  "about",
  "experience",
  "projects",
  "writing",
  "contact",
  "terminal",
] as const;

/**
 * Parses a hash string into a typed Route object.
 * #/ -> { view: "desktop" }
 * #/classic -> { view: "classic" }
 * #/app/<id> -> { view: "app", appId: id }
 */
export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#\/?/, "");
  const [withoutQuery] = raw.split("?");
  const clean = withoutQuery.replace(/\/+$/, "");

  if (!clean || clean === "/") {
    return { view: "desktop" };
  }

  if (clean === "classic") {
    return { view: "classic" };
  }

  if (clean.startsWith("app/")) {
    const id = clean.slice(4) as AppId;
    if (VALID_APP_IDS.includes(id)) {
      return { view: "app", appId: id };
    }
  }

  return { view: "desktop" };
}

/**
 * Converts a Route object into a hash string.
 */
export function routeToHash(route: Route): string {
  switch (route.view) {
    case "classic":
      return "#/classic";
    case "app":
      return `#/app/${route.appId}`;
    case "desktop":
    default:
      return "#/";
  }
}

/**
 * Navigates by updating the window hash.
 */
export function navigate(route: Route): void {
  if (typeof window === "undefined") return;
  const hash = routeToHash(route);
  if (window.location.hash !== hash) {
    window.location.hash = hash;
  }
}

/**
 * Hook to subscribe to hash changes and return the active Route.
 */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => {
    if (typeof window === "undefined") {
      return { view: "desktop" };
    }
    return parseRoute(window.location.hash);
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const onHashChange = () => {
      setRoute(parseRoute(window.location.hash));
    };

    window.addEventListener("hashchange", onHashChange);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
    };
  }, []);

  return route;
}

export * from "./prefs";
