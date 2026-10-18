import type { ComponentType, LazyExoticComponent } from "react";

export type AppId =
  | "about"
  | "experience"
  | "projects"
  | "writing"
  | "contact"
  | "terminal";

export interface AppProps {
  windowId: string;
}

export interface AppDefinition {
  id: AppId;
  title: string;
  icon: string /* emoji or /public path */;
  order: number;
  defaultSize: { w: number; h: number };
  component: LazyExoticComponent<ComponentType<AppProps>>;
}

export interface WindowState {
  id: string;
  appId: AppId;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
}

export interface OSApi {
  open(appId: AppId): void;
  close(id: string): void;
  focus(id: string): void;
  windows: WindowState[];
  minimize?: (id: string) => void;
  restore?: (id: string) => void;
}

export type Theme = "green" | "amber" | "light";

export interface PrefsApi {
  theme: Theme;
  setTheme(t: Theme): void;
  crt: boolean;
  setCrt(on: boolean): void;
  reducedMotion: boolean;
}

export type Route =
  | { view: "desktop" }
  | { view: "classic" }
  | { view: "app"; appId: AppId };

export interface DesktopItem {
  id: string;
  title: string;
  icon: string;
  appId?: AppId;
  isClassic?: boolean;
}

export interface DesktopProps {
  apps: AppDefinition[];
  os?: OSApi;
  prefs?: PrefsApi;
  onNavigate?: (path: string) => void;
  initialSelectedId?: string;
  defaultTheme?: Theme;
  banner?: React.ReactNode;
  children?: React.ReactNode;
}
