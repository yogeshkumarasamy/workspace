import type { ComponentType, LazyExoticComponent, ReactNode } from "react";

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
}

export interface WindowManagerApi extends OSApi {
  minimize(id: string): void;
  maximize(id: string): void;
  restore(id: string): void;
  move(id: string, x: number, y: number): void;
  resize(id: string, w: number, h: number): void;
  focusedWindowId: string | null;
}

export type WindowAction =
  | { type: "OPEN"; appId: AppId; defaultSize?: { w: number; h: number } }
  | { type: "CLOSE"; id: string }
  | { type: "FOCUS"; id: string }
  | { type: "MINIMIZE"; id: string }
  | { type: "MAXIMIZE"; id: string }
  | { type: "RESTORE"; id: string }
  | { type: "MOVE"; id: string; x: number; y: number }
  | { type: "RESIZE"; id: string; w: number; h: number };

export interface WindowManagerState {
  windows: WindowState[];
  cascadeCounter: number;
  focusedWindowId: string | null;
}

export interface WindowProps {
  state: WindowState;
  title: string;
  children?: ReactNode;
  icon?: string;
  onClose?: (id: string) => void;
  onFocus?: (id: string) => void;
  onMinimize?: (id: string) => void;
  onMaximize?: (id: string) => void;
  className?: string;
}

export interface WindowLayerProps {
  apps?: AppDefinition[] | Record<string, AppDefinition>;
  getApp?: (id: AppId) => AppDefinition | undefined;
  className?: string;
}

export interface WindowManagerProviderProps {
  children?: ReactNode;
  apps?: AppDefinition[] | Record<string, AppDefinition>;
  initialWindows?: WindowState[];
}
