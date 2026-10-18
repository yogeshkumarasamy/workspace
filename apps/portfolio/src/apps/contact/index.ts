import React, { lazy } from "react";
import type { AppDefinition, AppProps } from "./types";

const LazyContactApp = lazy(
  () => import("./ContactApp") as Promise<{ default: React.ComponentType<AppProps> }>,
);

export const contactApp: AppDefinition = {
  id: "contact",
  title: "Contact.lnk",
  icon: "✉️",
  order: 5,
  defaultSize: { w: 460, h: 360 },
  component: LazyContactApp,
};

export default contactApp;
export { ContactApp } from "./ContactApp";
export { ContactView } from "./ContactView";
export * from "./types";
