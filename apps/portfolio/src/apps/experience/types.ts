import type { ComponentType, LazyExoticComponent } from "react";

export type ISODateMonth = `${number}-${number}`; // "2024-07"

export interface Role {
  company: string;
  companyUrl?: string;
  title: string;
  start: ISODateMonth;
  end: ISODateMonth | null;
  location: string | null;
  bullets: string[];
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
  icon: string /* emoji or /public path */;
  order: number;
  defaultSize: { w: number; h: number };
  component: LazyExoticComponent<ComponentType<AppProps>>;
}

export interface CompanyGroup {
  company: string;
  companyUrl?: string;
  location: string | null;
  start: ISODateMonth;
  end: ISODateMonth | null;
  duration: string;
  roles: Role[];
}

export interface ExperienceAppProps extends Partial<AppProps> {
  roles?: Role[];
  referenceDate?: Date;
}
