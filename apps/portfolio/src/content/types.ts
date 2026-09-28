export interface ExperienceEntry {
  title: string;
  company: string;
  companyUrl?: string | null;
  /** Optional company-group duration label from LinkedIn (e.g. "3 years 6 months") */
  companyGroupTotal?: string | null;
  location?: string | null;
  /** ISO-ish month string YYYY-MM for sorting/display helpers */
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  /** Always empty until Owner provides — never invent */
  bullets: string[];
  /** Optional LinkedIn sub-line (FULL Creative headline echo) — not a bullet list */
  note?: string | null;
}

export interface EducationEntry {
  school: string;
  degree: string | null;
  years: string;
}

export interface ProjectEntry {
  name: string;
  url: string;
  language?: string;
  description: string;
}

export interface WritingEntry {
  title: string;
  venue: string;
  date: string; // YYYY-MM-DD
  url: string;
}

export interface Profile {
  name: string;
  nameAliases: string[];
  headline: string;
  location: string;
  about: string | null;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: string[];
  certifications: { name: string; issuer?: string; url?: string }[];
  projects: ProjectEntry[];
  writing: WritingEntry[];
  links: {
    linkedIn: string;
    medium: string;
    github: string;
    company: string;
    email: string | null;
    phone: string | null;
  };
}
