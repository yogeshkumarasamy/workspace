import { lazy } from "react";
import type { AppDefinition } from "./types";

export const experienceApp: AppDefinition = {
  id: "experience",
  title: "Experience.exe",
  icon: "💼",
  order: 2,
  defaultSize: { w: 640, h: 480 },
  component: lazy(() => import("./ExperienceApp")),
};

export default experienceApp;
export { ExperienceApp } from "./ExperienceApp";
export { defaultRoles } from "./__fixtures__/experience";
export * from "./types";
export * from "./format";
export * from "./group";
