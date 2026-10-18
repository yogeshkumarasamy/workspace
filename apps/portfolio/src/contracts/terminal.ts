import type { Profile } from "./content";
import type { OSApi, PrefsApi } from "./os";
export interface TerminalContext {
  profile: Profile;
  os: OSApi;
  prefs: PrefsApi;
  navigate(to: "classic" | "desktop"): void;
}
export interface TerminalCommand {
  name: string;
  summary: string;
  run(args: string[], ctx: TerminalContext): string | string[];
}
