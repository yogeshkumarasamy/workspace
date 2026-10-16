import type { ComponentType, LazyExoticComponent } from "react";

export type ISODateMonth = `${number}-${number}`; // e.g. "2024-07"

export interface Link {
  label: string;
  href: string;
}

export interface Role {
  company: string;
  companyUrl?: string;
  title: string;
  start: ISODateMonth;
  end: ISODateMonth | null;
  location: string | null;
  bullets: string[];
}

export interface Project {
  name: string;
  description: string;
  href: string;
  language?: string;
}

export interface Article {
  title: string;
  publication: string;
  date: string;
  href: string;
}

export interface Education {
  institution: string;
  credential: string | null;
  start: number;
  end: number;
}

export interface Profile {
  name: string;
  aliases: string[];
  headline: string;
  location: string;
  email: string;
  about: string | null;
  photo: string | null;
  phone: string | null;
  links: { linkedin: string; github: string; medium: string };
  skills: string[];
  experience: Role[];
  projects: Project[];
  writing: Article[];
  education: Education[];
  certifications: string[];
}

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
  icon: string;
  order: number;
  defaultSize: { w: number; h: number };
  component: LazyExoticComponent<ComponentType<AppProps>>;
}

export interface WindowState {
  id: string;
  appId: AppId;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
}

export interface OSApi {
  open(appId: AppId): void;
  close(id: string): void;
  focus(id: string): void;
  windows: WindowState[];
}

export type Theme = "green" | "amber" | "light";

export interface PrefsApi {
  theme: Theme;
  setTheme(t: Theme): void;
  crt: boolean;
  setCrt(on: boolean): void;
  reducedMotion: boolean;
}

export type Route =
  | { view: "desktop" }
  | { view: "classic" }
  | { view: "app"; appId: AppId };

export interface TerminalContext {
  profile: Profile;
  os: OSApi;
  prefs: PrefsApi;
  navigate(to: "classic" | "desktop"): void;
  history?: string[];
}

export interface TerminalCommand {
  name: string;
  summary: string;
  run(args: string[], ctx: TerminalContext): string | string[];
}

export interface TerminalOutputEntry {
  id: string;
  command?: string;
  output?: string[];
}
