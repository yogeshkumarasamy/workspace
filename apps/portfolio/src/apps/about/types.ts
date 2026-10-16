import type { ComponentType, LazyExoticComponent } from "react";

/**
 * Contracts mirrored from PRD §13.1.
 * S01 owns the canonical src/contracts/* modules once merged.
 * These types keep the About app self-contained and buildable until then.
 */

export type ISODateMonth = `${number}-${number}`;

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

export interface AboutAppProps extends Partial<AppProps> {
  profile?: Profile;
  isDev?: boolean;
}
