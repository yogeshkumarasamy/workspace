import type { AppDefinition, AppId, AppProps } from "../../contracts/apps";
import type { Project } from "../../contracts/content";

export type { AppDefinition, AppId, AppProps, Project };

export interface ProjectsAppProps extends Partial<AppProps> {
  projects?: Project[];
  githubUrl?: string;
}
