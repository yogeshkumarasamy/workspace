import type { Article, Profile } from "../../contracts/content";
import type { AppDefinition, AppId, AppProps } from "../../contracts/apps";

export type { Article, Profile, AppDefinition, AppId, AppProps };

export interface WritingAppProps extends Partial<AppProps> {
  articles?: Article[];
  mediumUrl?: string;
  className?: string;
}
