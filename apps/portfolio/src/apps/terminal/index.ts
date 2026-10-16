import React from "react";
import type { AppDefinition, AppProps } from "./types";
import { commands } from "./commands";

const LazyTerminalApp = React.lazy(
  () => import("./TerminalApp") as Promise<{ default: React.ComponentType<AppProps> }>,
);

/**
 * Terminal AppDefinition contract matching PRD §13.1 & §13.2.
 */
export const terminalAppDefinition: AppDefinition = {
  id: "terminal",
  title: "Terminal",
  icon: "📟",
  order: 6,
  defaultSize: { w: 640, h: 420 },
  component: LazyTerminalApp,
};

export default terminalAppDefinition;
export { commands };
export { TerminalApp, CHIP_COMMANDS, PROMPT_STRING } from "./TerminalApp";
export { executeCommand, getTabCompletions } from "./commands";
export * from "./types";
export { verifiedProfile } from "./__fixtures__/profile";
