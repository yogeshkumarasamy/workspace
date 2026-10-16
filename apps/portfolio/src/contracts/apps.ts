import type { ComponentType, LazyExoticComponent } from "react";
export type AppId =
  "about" | "experience" | "projects" | "writing" | "contact" | "terminal";
export interface AppDefinition {
  id: AppId;
  title: string;
  icon: string /* emoji or /public path */;
  order: number;
  defaultSize: { w: number; h: number };
  component: LazyExoticComponent<ComponentType<AppProps>>;
}
export interface AppProps {
  windowId: string;
}
