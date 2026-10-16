/**
 * Types for Portfolio SEO module.
 * Derived verbatim from PRD §13.1 content contracts.
 */

export type ISODateMonth = `${number}-${number}`; // "2024-07"

export interface Role {
  company: string;
  title: string;
  start: ISODateMonth;
  end: ISODateMonth | "present";
  location: string | null;
  bullets: string[];
}

export interface Project {
  name: string;
  summary: string;
  url: string;
  tags: string[];
}

export interface Article {
  title: string;
  url: string;
  date: string;
  publisher: string;
}

export interface Education {
  institution: string;
  degree: string;
  field: string;
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
