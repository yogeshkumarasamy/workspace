/* Type shims for unmerged modules so S01 compiles cleanly standalone */

declare module "*/content" {
  export const profile: import("../../contracts/content").Profile;
}

declare module "*/os/boot" {
  import type { ComponentType } from "react";
  export const BootScreen: ComponentType<{ onDone(): void }>;
}

declare module "*/os/window-manager" {
  import type { ComponentType, ReactNode } from "react";
  import type { OSApi, WindowState } from "../../contracts/os";
  export const WindowManagerProvider: ComponentType<{ children: ReactNode }>;
  export function useOS(): OSApi;
  export const Window: ComponentType<{
    state: WindowState;
    title: string;
    children: ReactNode;
  }>;
  export const WindowLayer: ComponentType;
}

declare module "*/os/desktop" {
  import type { ComponentType } from "react";
  import type { AppDefinition } from "../../contracts/apps";
  export const Desktop: ComponentType<{ apps: AppDefinition[] }>;
}

declare module "*/classic" {
  import type { ComponentType } from "react";
  import type { Profile } from "../../contracts/content";
  export const ClassicView: ComponentType<{ profile: Profile }>;
}
