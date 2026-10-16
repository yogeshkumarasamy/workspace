export { WindowManagerProvider, useOS, useWindowManager } from "./context";
export { Window } from "./Window";
export { WindowLayer } from "./WindowLayer";
export {
  windowManagerReducer,
  clampToViewport,
  createInitialState,
  CASCADE_BASE_X,
  CASCADE_BASE_Y,
  CASCADE_OFFSET,
  CASCADE_CYCLE,
} from "./reducer";

export type {
  AppDefinition,
  AppId,
  AppProps,
  OSApi,
  WindowAction,
  WindowLayerProps,
  WindowManagerApi,
  WindowManagerProviderProps,
  WindowManagerState,
  WindowProps,
  WindowState,
} from "./types";
