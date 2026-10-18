import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { groupProjectsByCompany, profile } from "../index";

function collectAllStrings(
  obj: unknown,
  path = "",
): Array<{ path: string; value: string }> {
  const strings: Array<{ path: string; value: string }> = [];

  if (typeof obj === "string") {
    strings.push({ path, value: obj });
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      strings.push(...collectAllStrings(item, `${path}[${index}]`));
    });
  } else if (obj !== null && typeof obj === "object") {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      strings.push(...collectAllStrings(value, currentPath));
    }
  }

  return strings;
}

describe("Portfolio Content Module (PRD §4 & §13.1)", () => {
  describe("Profile shape contract", () => {
    it("exports profile matching Profile contract", () => {
      assert.equal(typeof profile.name, "string");
      assert.ok(Array.isArray(profile.aliases));
      assert.equal(typeof profile.headline, "string");
      assert.equal(typeof profile.location, "string");
      assert.equal(typeof profile.email, "string");
      assert.equal(profile.about, null);
      assert.equal(profile.photo, null);
      assert.equal(profile.phone, null);

      assert.equal(typeof profile.links, "object");
      assert.equal(typeof profile.links.linkedin, "string");
      assert.equal(typeof profile.links.github, "string");
      assert.equal(typeof profile.links.medium, "string");

      assert.ok(Array.isArray(profile.skills));
      assert.ok(Array.isArray(profile.experience));
      assert.ok(Array.isArray(profile.projects));
      assert.ok(Array.isArray(profile.writing));
      assert.ok(Array.isArray(profile.education));
      assert.ok(Array.isArray(profile.certifications));
    });
  });

  describe("Non-empty string assertion", () => {
    it("contains no empty or whitespace-only strings anywhere in the profile data", () => {
      const allStrings = collectAllStrings(profile);
      assert.ok(allStrings.length > 0);

      for (const { path, value } of allStrings) {
        assert.ok(
          value.trim().length > 0,
          `String at ${path} must not be empty or whitespace-only`,
        );
        assert.notEqual(value, "");
      }
    });
  });

  describe("Experience ordering and date integrity", () => {
    it("contains exactly 9 roles matching PRD §4", () => {
      assert.equal(profile.experience.length, 9);
    });

    it("is sorted in reverse-chronological order by start date", () => {
      const startDates = profile.experience.map((role) => role.start);

      // Verify each start date is greater than or equal to the next start date
      for (let i = 0; i < startDates.length - 1; i++) {
        assert.ok(
          startDates[i] >= startDates[i + 1],
          `Experience at index ${i} (${startDates[i]}) must start after index ${i + 1} (${startDates[i + 1]})`,
        );
      }

      // Verify exact start dates in order
      assert.deepEqual(startDates, [
        "2024-07",
        "2023-01",
        "2021-02",
        "2020-09",
        "2018-05",
        "2016-07",
        "2016-01",
        "2014-05",
        "2012-10",
      ]);
    });

    it("conforms to ISODateMonth format and valid ranges", () => {
      const isoMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

      profile.experience.forEach((role, idx) => {
        assert.match(role.start, isoMonthRegex);

        if (idx === 0) {
          // Current role has end === null
          assert.equal(role.end, null);
        } else {
          assert.notEqual(role.end, null);
          if (role.end) {
            assert.match(role.end, isoMonthRegex);
            assert.ok(
              role.end >= role.start,
              `End date ${role.end} must be >= start date ${role.start}`,
            );
          }
        }
      });
    });

    it("has empty bullets array for all roles pending Owner input", () => {
      profile.experience.forEach((role) => {
        assert.deepEqual(role.bullets, []);
      });
    });

    it("has exact company names and titles in order", () => {
      const expected = [
        {
          company: "FULL Creative",
          title: "Senior Software Engineer",
          companyUrl: "https://full.io/",
          location: "Chennai, Tamil Nadu, India",
        },
        {
          company: "Trimble Inc.",
          title: "Lead UI Engineer",
          location: "Chennai, Tamil Nadu, India",
        },
        {
          company: "Trimble Inc.",
          title: "Senior Software Engineer",
          location: "Chennai, Tamil Nadu, India",
        },
        {
          company: "BI WORLDWIDE",
          title: "Associate Specialist",
          location: "Chennai, Tamil Nadu, India",
        },
        {
          company: "BI WORLDWIDE",
          title: "Senior Software Engineer",
          location: "Chennai, Tamil Nadu, India",
        },
        {
          company: "Accenture",
          title: "Application Development Senior Analyst",
          location: "Chennai Area, India",
        },
        {
          company: "Pearson English Business Solutions",
          title: "UI Developer",
          location: "Chennai Area, India",
        },
        {
          company: "ISGN",
          title: "UI Developer",
          location: "Chennai Area, India",
        },
        {
          company: "The Design Factory",
          title: "Front end web developer",
          location: null,
        },
      ];

      expected.forEach((item, idx) => {
        const actual = profile.experience[idx];
        assert.equal(actual.company, item.company);
        assert.equal(actual.title, item.title);
        assert.equal(actual.location, item.location);
        if (item.companyUrl) {
          assert.equal(actual.companyUrl, item.companyUrl);
        }
      });
    });
  });

  describe("Verified facts integrity (PRD §4)", () => {
    it("asserts verified identity, headline, and email", () => {
      assert.equal(profile.name, "Yogesh Kumarasamy");
      assert.deepEqual(profile.aliases, ["yogesh kumar"]);
      assert.equal(
        profile.headline,
        "Senior Software Engineer at FULL Creative",
      );
      assert.equal(profile.location, "Chennai, Tamil Nadu, India");
      assert.equal(profile.email, "yogeshkumarasamy@gmail.com");
    });

    it("asserts verified links", () => {
      assert.equal(
        profile.links.linkedin,
        "https://www.linkedin.com/in/yogeshkumarasamy",
      );
      assert.equal(profile.links.github, "https://github.com/yogeshkumarasamy");
      assert.equal(
        profile.links.medium,
        "https://medium.com/@yogeshkumarasamy",
      );
    });

    it("asserts the shared skills list and named groups", () => {
      assert.deepEqual(profile.skills, [
        "HTML5",
        "CSS3",
        "JavaScript",
        "ES6",
        "React.js",
        "Redux",
        "Webpack",
        "Vite",
        "Vitest",
        "Playwright",
        "Node.js",
        "Express",
        "Mongoose",
        "GCP",
        "CI/CD",
        "Caching and remote task caching in CI",
        "Docker",
        "Design system (EDS)",
        "shadcn",
        "TypeScript",
        "ESLint",
        "Prettier",
        "pnpm",
      ]);
      assert.deepEqual(profile.skillGroups, [
        { label: "Monorepos", skills: ["Moonrepo", "Turborepo"] },
        { label: "Design tools", skills: ["Figma"] },
        { label: "Agentic tools", skills: ["Claude", "Grok", "Antigravity"] },
      ]);
    });

    it("asserts verified education", () => {
      assert.deepEqual(profile.education, [
        {
          institution: "RVS College of Engineering and Technology",
          credential: "B.Tech., Information Technology",
          start: 2008,
          end: 2012,
        },
      ]);
    });

    it("asserts verified writing", () => {
      assert.deepEqual(profile.writing, [
        {
          title: "How SSH Makes Managing Multiple Git Accounts Easy and Secure",
          publication: "FULL Creative blog on Medium",
          date: "2025-04-17",
          href: "https://medium.com/full-creative-blog/how-ssh-makes-managing-multiple-git-accounts-easy-and-secure-1e9f43c8b071",
        },
      ]);
    });

    it("asserts company projects and excludes vitest-portfolio and private repos", () => {
      assert.deepEqual(
        groupProjectsByCompany(profile.projects).map((group) => ({
          company: group.company,
          projects: group.projects.map((project) => ({
            name: project.name,
            href: project.href,
          })),
        })),
        [
          {
            company: "Full Creative",
            projects: [
              {
                name: "Booking page",
                href: "https://anywhere.setmore.com/kevin-payne",
              },
              { name: "BaseApp", href: "https://go.setmore.com/" },
              { name: "ChatSupport", href: "https://chatsupport.co/" },
            ],
          },
          { company: "Trimble", projects: [{ name: "Kuebix", href: undefined }] },
          {
            company: "BI WORLDWIDE",
            projects: [
              { name: "Daymaker", href: undefined },
              { name: "Goodman", href: undefined },
              { name: "Recognition TV", href: undefined },
              { name: "Ecards UI", href: undefined },
              { name: "Delivery customizations", href: undefined },
            ],
          },
          {
            company: "Accenture",
            projects: [
              { name: "AusNet", href: undefined },
              { name: "CMHC", href: undefined },
              { name: "Volvo", href: undefined },
            ],
          },
          {
            company: "Pearson English",
            projects: [
              { name: "Dashboard", href: undefined },
              { name: "Digital Classroom", href: undefined },
            ],
          },
        ],
      );

      const serialized = JSON.stringify(profile);
      assert.equal(serialized.toLowerCase().includes("vitest-portfolio"), false);
      profile.projects.forEach((proj) => {
        assert.equal(proj.name.toLowerCase().includes("workspace"), false);
        assert.equal((proj.href ?? "").toLowerCase().includes("workspace"), false);
        assert.equal(proj.description, undefined);
      });
    });

    it("asserts unpopulated placeholders per acceptance criteria", () => {
      assert.equal(profile.about, null);
      assert.equal(profile.photo, null);
      assert.equal(profile.phone, null);
      assert.deepEqual(profile.certifications, []);
    });

    it("verifies all external URLs use secure HTTPS protocol", () => {
      assert.ok(profile.links.linkedin.startsWith("https://"));
      assert.ok(profile.links.github.startsWith("https://"));
      assert.ok(profile.links.medium.startsWith("https://"));

      profile.projects.forEach((proj) => {
        if (proj.href) {
          assert.ok(proj.href.startsWith("https://"));
        }
      });

      profile.writing.forEach((art) => {
        assert.ok(art.href.startsWith("https://"));
      });

      profile.experience.forEach((role) => {
        if (role.companyUrl) {
          assert.ok(role.companyUrl.startsWith("https://"));
        }
      });
    });

    it("verifies unique skills and valid education year spans", () => {
      const uniqueSkills = new Set(profile.skills);
      assert.equal(uniqueSkills.size, profile.skills.length);

      profile.education.forEach((edu) => {
        assert.ok(edu.start > 1900 && edu.start <= edu.end);
        assert.ok(edu.end <= new Date().getFullYear());
      });
    });

    it("verifies no property in profile is undefined", () => {
      for (const [key, value] of Object.entries(profile)) {
        assert.notEqual(
          value,
          undefined,
          `Profile key ${key} must not be undefined`,
        );
      }
    });
  });
});

