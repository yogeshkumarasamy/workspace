import type { Project } from "../types";

/**
 * Verified GitHub profile URL from PRD §4.
 */
export const defaultGithubUrl = "https://github.com/yogeshkumarasamy";

/**
 * Verified projects from PRD §4 only.
 * No invented facts. Private workspace repository is strictly excluded.
 */
export const verifiedProjects: Project[] = [
  {
    name: "vitest-portfolio",
    description:
      "volume of browser test files to stress Vitest test runs and performance",
    href: "https://github.com/yogeshkumarasamy/vitest-portfolio",
    language: "TypeScript",
  },
];
