import React from "react";
import type { AppDefinition, AppProps } from "./types";

/**
 * Lazy component for the About app window.
 */
const LazyAboutApp = React.lazy(
  () => import("./AboutApp") as Promise<{ default: React.ComponentType<AppProps> }>,
);

/**
 * AppDefinition contract for About.txt.
 * Exported as default matching PRD §13.2.
 */
export const aboutAppDefinition: AppDefinition = {
  id: "about",
  title: "About.txt",
  icon: "📄",
  order: 1,
  defaultSize: { w: 580, h: 420 },
  component: LazyAboutApp,
};

export default aboutAppDefinition;

export { default as AboutApp, AboutView, ABOUT_DEV_PLACEHOLDER } from "./AboutApp";
export * from "./types";
export { verifiedProfile, profileWithBio } from "./__fixtures__/profile";
