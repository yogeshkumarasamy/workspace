import type { AppDefinition } from "../contracts/apps";

/**
 * Discovers and sorts all registered apps via Vite import.meta.glob.
 * Adding an app only requires creating its folder under src/apps/<id>/index.ts.
 * Returns empty array when no apps are present.
 */
export function loadApps(): AppDefinition[] {
  const modules = import.meta.glob<Record<string, unknown>>("./*/index.ts", {
    eager: true,
  });

  return Object.values(modules)
    .map((mod) =>
      mod && typeof mod === "object" && "default" in mod
        ? (mod.default as AppDefinition)
        : null
    )
    .filter((app): app is AppDefinition => Boolean(app && app.id && app.title))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export const apps: AppDefinition[] = loadApps();

export function getApp(id: string): AppDefinition | undefined {
  return apps.find((app) => app.id === id);
}
