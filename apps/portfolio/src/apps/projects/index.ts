import React, { lazy } from "react";
import type { AppDefinition, AppProps } from "./types";

const LazyProjectsApp = lazy(
  () => import("./ProjectsApp") as Promise<{ default: React.ComponentType<AppProps> }>,
);

export const projectsApp: AppDefinition = {
  id: "projects",
  title: "Projects",
  icon: "📁",
  order: 3,
  defaultSize: { w: 580, h: 420 },
  component: LazyProjectsApp,
};

export default projectsApp;
export { ProjectsApp } from "./ProjectsApp";
export { ProjectsView } from "./ProjectsView";
export * from "./types";
