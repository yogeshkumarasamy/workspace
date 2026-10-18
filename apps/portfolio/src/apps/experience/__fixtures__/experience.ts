import type { Role } from "../types";

/**
 * Verified experience from PRD §4 only.
 * Preserves exact LinkedIn order and overlaps.
 * bullets: [] until Owner supplies.
 */
export const defaultRoles: Role[] = [
  {
    company: "FULL Creative",
    companyUrl: "https://full.io/",
    title: "Senior Software Engineer",
    start: "2024-07",
    end: null,
    location: "Chennai, Tamil Nadu, India",
    bullets: [],
  },
  {
    company: "Trimble Inc.",
    title: "Lead UI Engineer",
    start: "2023-01",
    end: "2024-07",
    location: "Chennai, Tamil Nadu, India",
    bullets: [],
  },
  {
    company: "Trimble Inc.",
    title: "Senior Software Engineer",
    start: "2021-02",
    end: "2023-01",
    location: "Chennai, Tamil Nadu, India",
    bullets: [],
  },
  {
    company: "BI WORLDWIDE",
    title: "Associate Specialist",
    start: "2020-09",
    end: "2021-02",
    location: "Chennai, Tamil Nadu, India",
    bullets: [],
  },
  {
    company: "BI WORLDWIDE",
    title: "Senior Software Engineer",
    start: "2018-05",
    end: "2020-09",
    location: "Chennai, Tamil Nadu, India",
    bullets: [],
  },
  {
    company: "Accenture",
    title: "Application Development Senior Analyst",
    start: "2016-07",
    end: "2018-04",
    location: "Chennai Area, India",
    bullets: [],
  },
  {
    company: "Pearson English Business Solutions",
    title: "UI Developer",
    start: "2016-01",
    end: "2017-07",
    location: "Chennai Area, India",
    bullets: [],
  },
  {
    company: "ISGN",
    title: "UI Developer",
    start: "2014-05",
    end: "2015-01",
    location: "Chennai Area, India",
    bullets: [],
  },
  {
    company: "The Design Factory",
    title: "Front end web developer",
    start: "2012-10",
    end: "2014-04",
    location: null,
    bullets: [],
  },
];
