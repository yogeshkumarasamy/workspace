import type { AppProps, AppDefinition } from "../../contracts/apps";
import type { Profile } from "../../contracts/content";

export type { AppProps, AppDefinition, Profile };

export interface ContactViewProps {
  windowId: string;
  profile?: Profile;
}
