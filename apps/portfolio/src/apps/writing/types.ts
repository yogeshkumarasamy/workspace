import type { ComponentType, LazyExoticComponent } from "react";

/**
 * Local copies of the PRD §13.1 slices this window needs.
 * S01 owns `src/contracts/*`. These stay inside the writing folder until that lands.
 * `Profile` is the writing slice of the contract profile: full profiles stay assignable.
 */

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
  /** Emoji or a path under `public/`. */
  icon: string;
  order: number;
  defaultSize: { w: number; h: number };
  component: LazyExoticComponent<ComponentType<AppProps>>;
}

export interface Article {
  title: string;
  publication: string;
  date: string;
  href: string;
}

export interface Profile {
  links: { medium: string };
  writing: Article[];
}
