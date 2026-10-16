import type { AppProps, AppDefinition } from "../../contracts/apps";
import type { Profile, Project } from "../../contracts/content";

export type { AppProps, AppDefinition, Profile, Project };

export interface ProjectsViewProps {
  windowId: string;
  profile?: Profile;
}
