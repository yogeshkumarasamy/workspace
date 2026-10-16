import type { CompanyGroup, ISODateMonth, Role } from "./types";
import { computeDateSpanDuration } from "./format";

/**
 * Compares two ISODateMonth strings.
 * Earlier dates return negative, later positive.
 */
function compareIsoDates(a: string, b: string): number {
  return a.localeCompare(b);
}

/**
 * Groups a flat list of roles by company while preserving the original
 * order of appearance from LinkedIn (including overlaps).
 *
 * For each company:
 * - Identifies all roles belonging to that company.
 * - Computes the company's earliest start date and latest end date (or null if any role is ongoing).
 * - Computes the total span duration for the company.
 * - Aggregates shared location or companyUrl if present.
 */
export function groupRolesByCompany(roles: Role[], referenceDate: Date = new Date()): CompanyGroup[] {
  const groups: CompanyGroup[] = [];
  const companyMap = new Map<string, CompanyGroup>();

  for (const role of roles) {
    const existing = companyMap.get(role.company);
    if (!existing) {
      const group: CompanyGroup = {
        company: role.company,
        companyUrl: role.companyUrl,
        location: role.location ?? null,
        start: role.start,
        end: role.end,
        duration: "",
        roles: [role],
      };
      companyMap.set(role.company, group);
      groups.push(group);
    } else {
      existing.roles.push(role);
      if (role.companyUrl && !existing.companyUrl) {
        existing.companyUrl = role.companyUrl;
      }
      if (role.location && !existing.location) {
        existing.location = role.location;
      }
    }
  }

  // Calculate start, end, and duration for each company group based on all roles
  for (const group of groups) {
    let earliestStart: ISODateMonth = group.roles[0].start;
    let hasOngoing = false;
    let latestEnd: ISODateMonth | null = group.roles[0].end;

    for (const role of group.roles) {
      if (compareIsoDates(role.start, earliestStart) < 0) {
        earliestStart = role.start;
      }
      if (role.end === null) {
        hasOngoing = true;
      } else if (!hasOngoing && latestEnd !== null) {
        if (compareIsoDates(role.end, latestEnd) > 0) {
          latestEnd = role.end;
        }
      }
    }

    group.start = earliestStart;
    group.end = hasOngoing ? null : latestEnd;
    group.duration = computeDateSpanDuration(group.start, group.end, referenceDate);
  }

  return groups;
}
