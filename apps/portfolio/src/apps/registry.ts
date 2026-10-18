import type { AppDefinition } from "../contracts/apps";

export interface AppEntryModule {
  default: AppDefinition;
}

export function sortAndFilterApps(modules: Record<string, unknown>): AppDefinition[] {
  const result: AppDefinition[] = [];
  for (const mod of Object.values(modules)) {
    const candidate = (mod as { default?: AppDefinition })?.default;
    if (candidate && candidate.id && typeof candidate.order === "number") {
      result.push(candidate);
    }
  }
  return result.sort((a, b) => a.order - b.order);
}

const discoveredModules = import.meta.glob<AppEntryModule>("./*/index.ts", {
  eager: true,
});

export const apps: AppDefinition[] = sortAndFilterApps(discoveredModules);

export function getApp(id: string): AppDefinition | undefined {
  return apps.find((app) => app.id === id);
}

export default apps;
