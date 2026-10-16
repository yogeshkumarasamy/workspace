/**
 * Mirrors PRD §13.1 `src/contracts/content.ts` verbatim.
 * S01 owns the real module. These local types keep Classic view buildable
 * until that file exists. Shapes must stay assignable to the contract.
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
