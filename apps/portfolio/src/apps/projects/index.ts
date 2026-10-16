import React from "react";
import type { AppDefinition, AppProps } from "./types";

const LazyProjectsApp = React.lazy(
  () =>
    import("./ProjectsApp") as Promise<{
      default: React.ComponentType<AppProps>;
    }>,
);

/**
 * Projects AppDefinition contract matching PRD §13.1 & §13.2.
 * Exported as default for auto-discovery by src/apps/registry.ts.
 */
export const projectsAppDefinition: AppDefinition = {
  id: "projects",
  title: "Projects/",
  icon: "📁",
  order: 3,
  defaultSize: { w: 640, h: 480 },
  component: LazyProjectsApp,
};

export default projectsAppDefinition;
export { ProjectsApp } from "./ProjectsApp";
export { defaultGithubUrl, verifiedProjects } from "./__fixtures__/projects";
export * from "./types";
