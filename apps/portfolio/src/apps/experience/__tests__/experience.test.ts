import { describe, expect, it } from "vitest";
import experienceApp, {
  computeDateSpanDuration,
  computeRoleDuration,
  defaultRoles,
  formatDuration,
  formatMonthYear,
  formatRoleDates,
  groupRolesByCompany,
  parseYearMonth,
} from "../index";
import type { Role } from "../types";

describe("Experience App", () => {
  describe("AppDefinition contract", () => {
    it("exports default AppDefinition with id 'experience' and order 2", () => {
      expect(experienceApp.id).toBe("experience");
      expect(experienceApp.order).toBe(2);
      expect(experienceApp.title).toBe("Experience.exe");
      expect(experienceApp.icon).toBe("💼");
      expect(experienceApp.defaultSize.w).toBe(640);
      expect(experienceApp.defaultSize.h).toBe(480);
      expect(typeof experienceApp.component).toBe("object");
    });
  });

  describe("Verified content integrity (PRD §4)", () => {
    it("contains exactly the 9 verified roles without invented facts", () => {
      expect(defaultRoles.length).toBe(9);

      const companies = defaultRoles.map((r) => r.company);
      expect(companies[0]).toBe("FULL Creative");
      expect(companies[1]).toBe("Trimble Inc.");
      expect(companies[2]).toBe("Trimble Inc.");
      expect(companies[3]).toBe("BI WORLDWIDE");
      expect(companies[4]).toBe("BI WORLDWIDE");
      expect(companies[5]).toBe("Accenture");
      expect(companies[6]).toBe("Pearson English Business Solutions");
      expect(companies[7]).toBe("ISGN");
      expect(companies[8]).toBe("The Design Factory");
    });

    it("has empty bullets for all verified roles (omitted until Owner supplies)", () => {
      for (const role of defaultRoles) {
        expect(role.bullets.length).toBe(0);
      }
    });

    it("has valid verified links and locations", () => {
      expect(defaultRoles[0].companyUrl).toBe("https://full.io/");
      expect(defaultRoles[0].location).toBe("Chennai, Tamil Nadu, India");
      expect(defaultRoles[8].location).toBe(null);
    });
  });

  describe("Company Grouping & LinkedIn Order/Overlaps", () => {
    it("groups roles by company while preserving LinkedIn order and overlaps", () => {
      const fixedDate = new Date("2026-10-16");
      const groups = groupRolesByCompany(defaultRoles, fixedDate);

      // 9 roles across 7 distinct companies
      expect(groups.length).toBe(7);

      expect(groups[0].company).toBe("FULL Creative");
      expect(groups[0].roles.length).toBe(1);

      // Trimble Inc. groups 2 consecutive roles
      expect(groups[1].company).toBe("Trimble Inc.");
      expect(groups[1].roles.length).toBe(2);
      expect(groups[1].roles[0].title).toBe("Lead UI Engineer");
      expect(groups[1].roles[1].title).toBe("Senior Software Engineer");
      expect(groups[1].start).toBe("2021-02");
      expect(groups[1].end).toBe("2024-07");
      expect(groups[1].duration).toBe("3 yrs 6 mos");

      // BI WORLDWIDE groups 2 consecutive roles
      expect(groups[2].company).toBe("BI WORLDWIDE");
      expect(groups[2].roles.length).toBe(2);
      expect(groups[2].roles[0].title).toBe("Associate Specialist");
      expect(groups[2].roles[1].title).toBe("Senior Software Engineer");
      expect(groups[2].start).toBe("2018-05");
      expect(groups[2].end).toBe("2021-02");
      expect(groups[2].duration).toBe("2 yrs 10 mos");

      // Preserves overlap: Accenture (2016-07 to 2018-04) appears before Pearson (2016-01 to 2017-07)
      expect(groups[3].company).toBe("Accenture");
      expect(groups[3].roles.length).toBe(1);
      expect(groups[3].start).toBe("2016-07");
      expect(groups[3].end).toBe("2018-04");

      expect(groups[4].company).toBe("Pearson English Business Solutions");
      expect(groups[4].roles.length).toBe(1);
      expect(groups[4].start).toBe("2016-01");
      expect(groups[4].end).toBe("2017-07");

      expect(groups[5].company).toBe("ISGN");
      expect(groups[5].roles.length).toBe(1);

      expect(groups[6].company).toBe("The Design Factory");
      expect(groups[6].roles.length).toBe(1);
    });

    it("inherits companyUrl and location onto company group", () => {
      const groups = groupRolesByCompany(defaultRoles);
      expect(groups[0].companyUrl).toBe("https://full.io/");
      expect(groups[0].location).toBe("Chennai, Tamil Nadu, India");
    });
  });

  describe("Date formatting & Computed durations", () => {
    it("formats year-month into 'MMM YYYY'", () => {
      expect(formatMonthYear("2024-07")).toBe("Jul 2024");
      expect(formatMonthYear("2023-01")).toBe("Jan 2023");
      expect(formatMonthYear("2012-10")).toBe("Oct 2012");
      expect(formatMonthYear("invalid")).toBe("invalid");
    });

    it("formats role date ranges as 'Jul 2024 – Present' with en-dash", () => {
      expect(formatRoleDates("2024-07", null)).toBe("Jul 2024 \u2013 Present");
      expect(formatRoleDates("2023-01", "2024-07")).toBe("Jan 2023 \u2013 Jul 2024");
      expect(formatRoleDates("2021-02", "2023-01")).toBe("Feb 2021 \u2013 Jan 2023");
    });

    it("parses year and month correctly", () => {
      expect(parseYearMonth("2024-07")).toEqual({ year: 2024, month: 7 });
      expect(parseYearMonth("2021-02")).toEqual({ year: 2021, month: 2 });
      expect(parseYearMonth("invalid")).toBe(null);
      expect(parseYearMonth("2024-13")).toBe(null);
    });

    it("computes duration strings accurately", () => {
      expect(formatDuration(0)).toBe("0 mos");
      expect(formatDuration(1)).toBe("1 mo");
      expect(formatDuration(6)).toBe("6 mos");
      expect(formatDuration(12)).toBe("1 yr");
      expect(formatDuration(13)).toBe("1 yr 1 mo");
      expect(formatDuration(19)).toBe("1 yr 7 mos");
      expect(formatDuration(24)).toBe("2 yrs");
      expect(formatDuration(28)).toBe("2 yrs 4 mos");
      expect(formatDuration(42)).toBe("3 yrs 6 mos");
    });

    it("computes role durations matching verified timeline", () => {
      const fixedDate = new Date("2026-10-16");

      // FULL Creative: 2024-07 to 2026-10 -> 2 yrs 4 mos
      expect(computeRoleDuration(defaultRoles[0], fixedDate)).toBe("2 yrs 4 mos");

      // Trimble Lead UI: 2023-01 to 2024-07 -> 1 yr 7 mos
      expect(computeRoleDuration(defaultRoles[1])).toBe("1 yr 7 mos");

      // Trimble Senior: 2021-02 to 2023-01 -> 2 yrs
      expect(computeRoleDuration(defaultRoles[2])).toBe("2 yrs");

      // BI WORLDWIDE Assoc: 2020-09 to 2021-02 -> 6 mos
      expect(computeRoleDuration(defaultRoles[3])).toBe("6 mos");

      // BI WORLDWIDE Senior: 2018-05 to 2020-09 -> 2 yrs 5 mos
      expect(computeRoleDuration(defaultRoles[4])).toBe("2 yrs 5 mos");

      // Accenture: 2016-07 to 2018-04 -> 1 yr 10 mos
      expect(computeRoleDuration(defaultRoles[5])).toBe("1 yr 10 mos");

      // Pearson: 2016-01 to 2017-07 -> 1 yr 7 mos
      expect(computeRoleDuration(defaultRoles[6])).toBe("1 yr 7 mos");

      // ISGN: 2014-05 to 2015-01 -> 9 mos
      expect(computeRoleDuration(defaultRoles[7])).toBe("9 mos");

      // The Design Factory: 2012-10 to 2014-04 -> 1 yr 7 mos
      expect(computeRoleDuration(defaultRoles[8])).toBe("1 yr 7 mos");
    });

    it("computes date span duration between arbitrary valid date pairs", () => {
      expect(computeDateSpanDuration("2021-02", "2024-07")).toBe("3 yrs 6 mos");
      expect(computeDateSpanDuration("2018-05", "2021-02")).toBe("2 yrs 10 mos");
      expect(computeDateSpanDuration("2024-01", "2024-01")).toBe("1 mo");
    });
  });

  describe("Bullets list omission criteria", () => {
    it("handles roles with bullets when present", () => {
      const customRole: Role = {
        company: "Test Corp",
        title: "Staff Engineer",
        start: "2022-01",
        end: "2023-01",
        location: "Remote",
        bullets: ["Architected microfrontends", "Mentored 5 engineers"],
      };

      expect(customRole.bullets.length).toBe(2);
      expect(customRole.bullets[0]).toBe("Architected microfrontends");
    });
  });
});
