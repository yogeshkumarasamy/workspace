export { Desktop, default } from "./Desktop";
export { DesktopGrid, CLASSIC_VIEW_ITEM } from "./DesktopGrid";
export { DesktopIcon } from "./DesktopIcon";
export { Taskbar } from "./Taskbar";
export { StartMenu } from "./StartMenu";
export {
  useOS,
  usePrefs,
  OSContext,
  PrefsContext,
  createMockOS,
} from "./context";
export type {
  AppId,
  AppProps,
  AppDefinition,
  WindowState,
  OSApi,
  Theme,
  PrefsApi,
  Route,
  DesktopProps,
  DesktopItem,
} from "./types";
