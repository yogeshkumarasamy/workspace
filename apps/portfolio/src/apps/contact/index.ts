import React from "react";
import type { AppDefinition, AppProps } from "./types";

/**
 * Lazy component for the Contact app window.
 */
const LazyContactApp = React.lazy(
  () => import("./ContactApp") as Promise<{ default: React.ComponentType<AppProps> }>,
);

/**
 * Contact AppDefinition contract matching PRD §13.1 & §13.2.
 */
export const contactAppDefinition: AppDefinition = {
  id: "contact",
  title: "Contact.lnk",
  icon: "📬",
  order: 5,
  defaultSize: { w: 520, h: 360 },
  component: LazyContactApp,
};

export default contactAppDefinition;

export { LazyContactApp };
export { verifiedContact } from "./__fixtures__/contact";
export * from "./types";
