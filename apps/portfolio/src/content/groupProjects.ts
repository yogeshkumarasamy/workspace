import type { Project } from "./types";

export interface ProjectCompanyGroup {
  company: string;
  projects: Project[];
}

/**
 * Groups projects by company, preserving first-seen company order and
 * the original order of projects inside each company.
 * Projects with no company stay in a single trailing group keyed by "".
 */
export function groupProjectsByCompany(projects: Project[]): ProjectCompanyGroup[] {
  const groups: ProjectCompanyGroup[] = [];
  const byCompany = new Map<string, ProjectCompanyGroup>();

  for (const project of projects) {
    const company = project.company ?? "";
    let group = byCompany.get(company);
    if (!group) {
      group = { company, projects: [] };
      byCompany.set(company, group);
      groups.push(group);
    }
    group.projects.push(project);
  }

  return groups;
}
