import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { ClassicView } from "../ClassicView";
import { verifiedProfileFixture } from "../fixtures";
import type { Profile } from "../../contracts/content";

const cssPath = path.resolve(process.cwd(), "src/classic/classic.css");

describe("ClassicView - S13 Accessible Fallback Résumé", () => {
  it("renders with default verified profile without errors", () => {
    const { container } = render(<ClassicView />);
    expect(
      Boolean(container.querySelector('[data-testid="classic-view"]')),
    ).toBe(true);
  });

  describe("Acceptance Criteria 1: Semantic landmarks, single h1, 7 required sections", () => {
    it("renders required semantic landmarks (banner, navigation, main, contentinfo)", () => {
      render(<ClassicView profile={verifiedProfileFixture} />);

      // Banner / Header landmark
      expect(Boolean(screen.getByRole("banner"))).toBe(true);

      // Navigation landmark
      expect(
        Boolean(screen.getByRole("navigation", { name: /résumé sections/i })),
      ).toBe(true);

      // Main landmark
      expect(Boolean(screen.getByRole("main"))).toBe(true);

      // Contentinfo / Footer landmark
      expect(Boolean(screen.getByRole("contentinfo"))).toBe(true);
    });

    it("has exactly one h1 containing the candidate's name", () => {
      render(<ClassicView profile={verifiedProfileFixture} />);

      const h1Headings = screen.getAllByRole("heading", { level: 1 });
      expect(h1Headings.length).toBe(1);
      expect(
        Boolean(
          h1Headings[0]?.textContent?.includes(verifiedProfileFixture.name),
        ),
      ).toBe(true);
    });

    it("renders all 7 required sections with level 2 headings matching their IDs", () => {
      const { container } = render(
        <ClassicView profile={verifiedProfileFixture} />,
      );

      const requiredSections = [
        "about",
        "experience",
        "projects",
        "writing",
        "skills",
        "education",
        "contact",
      ];

      for (const sectionId of requiredSections) {
        const sectionEl = container.querySelector(`section#${sectionId}`);
        expect(Boolean(sectionEl)).toBe(true);
        expect(sectionEl?.getAttribute("aria-labelledby")).toBe(
          `heading-${sectionId}`,
        );

        const headingEl = container.querySelector(`#heading-${sectionId}`);
        expect(Boolean(headingEl)).toBe(true);
        expect(headingEl?.tagName.toLowerCase()).toBe("h2");
      }

      // Verify h2 headings via accessible queries
      expect(
        Boolean(screen.getByRole("heading", { level: 2, name: /^about$/i })),
      ).toBe(true);
      expect(
        Boolean(
          screen.getByRole("heading", { level: 2, name: /^experience$/i }),
        ),
      ).toBe(true);
      expect(
        Boolean(screen.getByRole("heading", { level: 2, name: /^projects$/i })),
      ).toBe(true);
      expect(
        Boolean(screen.getByRole("heading", { level: 2, name: /^writing$/i })),
      ).toBe(true);
      expect(
        Boolean(screen.getByRole("heading", { level: 2, name: /^skills$/i })),
      ).toBe(true);
      expect(
        Boolean(
          screen.getByRole("heading", { level: 2, name: /^education$/i }),
        ),
      ).toBe(true);
      expect(
        Boolean(screen.getByRole("heading", { level: 2, name: /^contact$/i })),
      ).toBe(true);
    });
  });

  describe("Acceptance Criteria 2: Link back to desktop + print stylesheet", () => {
    it("renders links back to retro desktop in header toolbar and footer", () => {
      render(<ClassicView profile={verifiedProfileFixture} />);

      const desktopLinks = screen.getAllByRole("link", { name: /desktop/i });
      expect(desktopLinks.length >= 2).toBe(true);

      for (const link of desktopLinks) {
        expect(link.getAttribute("href")).toBe("#/");
      }
    });

    it("includes skip-to-main-content link for keyboard users", () => {
      render(<ClassicView profile={verifiedProfileFixture} />);

      const skipLink = screen.getByRole("link", {
        name: /skip to main content/i,
      });
      expect(Boolean(skipLink)).toBe(true);
      expect(skipLink.getAttribute("href")).toBe("#main-content");
    });

    it("includes in-page navigation links to all 7 sections", () => {
      render(<ClassicView profile={verifiedProfileFixture} />);

      const nav = screen.getByRole("navigation", { name: /résumé sections/i });
      const links = within(nav).getAllByRole("link");

      const expectedHrefs = [
        "#about",
        "#experience",
        "#projects",
        "#writing",
        "#skills",
        "#education",
        "#contact",
      ];

      for (const expectedHref of expectedHrefs) {
        const link = links.find((l) => l.getAttribute("href") === expectedHref);
        expect(Boolean(link)).toBe(true);
      }
    });

    it("print stylesheet is defined with page break and link URL printing rules", () => {
      expect(fs.existsSync(cssPath)).toBe(true);

      const css = fs.readFileSync(cssPath, "utf-8");

      // Verify print media query exists
      expect(css.includes("@media print")).toBe(true);

      // Verify chrome hiding in print
      expect(css.includes(".yk-classic__back-link")).toBe(true);
      expect(css.includes(".yk-classic__nav")).toBe(true);
      expect(css.includes("display: none !important")).toBe(true);

      // Verify link destination display in print
      expect(
        Boolean(
          css.match(
            /a\[href\^="http"\]::after\s*\{\s*content:\s*" \(" attr\(href\) "\)"/,
          ),
        ),
      ).toBe(true);
      expect(
        Boolean(
          css.match(
            /a\[href\^="mailto:"\]::after\s*\{\s*content:\s*" \(" attr\(href\) "\)"/,
          ),
        ),
      ).toBe(true);

      // Verify page break prevention rules
      expect(css.includes("page-break-inside: avoid")).toBe(true);
      expect(css.includes("break-inside: avoid")).toBe(true);
      expect(css.includes("page-break-after: avoid")).toBe(true);
    });
  });

  describe("Acceptance Criteria 3: CRT off & light theme tokens, no animations", () => {
    it("classic.css specifies no animations and no transitions", () => {
      const css = fs.readFileSync(cssPath, "utf-8");

      expect(css.includes("animation: none !important")).toBe(true);
      expect(css.includes("transition: none !important")).toBe(true);
    });

    it("uses light theme tokens as default fallback custom properties", () => {
      const css = fs.readFileSync(cssPath, "utf-8");

      expect(css.includes("var(--yk-bg, #ffffff)")).toBe(true);
      expect(css.includes("var(--yk-fg, #111111)")).toBe(true);
      expect(css.includes("var(--yk-accent, #000080)")).toBe(true);
      expect(css.includes("var(--yk-focus, #000080)")).toBe(true);
    });
  });

  describe("Acceptance Criteria 4: axe-clean accessibility via RTL role queries", () => {
    it("all interactive elements have accessible names and correct roles", () => {
      render(<ClassicView profile={verifiedProfileFixture} />);

      const allLinks = screen.getAllByRole("link");
      expect(allLinks.length > 0).toBe(true);

      for (const link of allLinks) {
        expect(
          Boolean(link.textContent || link.getAttribute("aria-label")),
        ).toBe(true);
        expect(Boolean(link.getAttribute("href"))).toBe(true);
      }
    });

    it("skills are structured in semantic unordered list with listitems", () => {
      render(<ClassicView profile={verifiedProfileFixture} />);

      const skillsList = screen.getByRole("list", {
        name: /verified technical skills/i,
      });
      const skillsItems = within(skillsList).getAllByRole("listitem");
      expect(skillsItems.length).toBe(verifiedProfileFixture.skills.length);
    });

    it("headings follow strict nesting hierarchy without skipping levels", () => {
      const { container } = render(
        <ClassicView profile={verifiedProfileFixture} />,
      );

      const headings = Array.from(
        container.querySelectorAll("h1, h2, h3, h4, h5, h6"),
      ).map((el) => ({
        tag: el.tagName.toLowerCase(),
        level: parseInt(el.tagName.substring(1), 10),
        text: el.textContent?.trim(),
      }));

      // Exactly one H1
      const h1Count = headings.filter((h) => h.level === 1).length;
      expect(h1Count).toBe(1);
      expect(headings[0]?.level).toBe(1);

      // No skipped heading levels (e.g. h1 directly followed by h3)
      for (let i = 1; i < headings.length; i++) {
        const prevLevel = headings[i - 1]?.level ?? 1;
        const currentLevel = headings[i]?.level ?? 1;
        expect(currentLevel - prevLevel <= 1).toBe(true);
      }
    });
  });

  describe("Acceptance Criteria 6: Uses verified content only (PRD §4); no invented facts", () => {
    it("displays verified candidate name, alias, headline, and location", () => {
      render(<ClassicView profile={verifiedProfileFixture} />);

      const banner = screen.getByRole("banner");
      expect(
        Boolean(
          within(banner).getByText("Yogesh Kumarasamy", { exact: false }),
        ),
      ).toBe(true);
      expect(
        Boolean(within(banner).getByText("(yogesh kumar)", { exact: false })),
      ).toBe(true);
      expect(
        Boolean(
          within(banner).getByText("Senior Software Engineer at FULL Creative"),
        ),
      ).toBe(true);
      expect(
        Boolean(within(banner).getByText("Chennai, Tamil Nadu, India")),
      ).toBe(true);
    });

    it("displays verified contact email and external URLs", () => {
      render(<ClassicView profile={verifiedProfileFixture} />);

      const emailLink = screen.getAllByRole("link", {
        name: /yogeshkumarasamy@gmail.com/i,
      })[0];
      expect(emailLink?.getAttribute("href")).toBe(
        "mailto:yogeshkumarasamy@gmail.com",
      );

      const linkedinLinks = screen.getAllByRole("link", { name: /linkedin/i });
      expect(linkedinLinks[0]?.getAttribute("href")).toBe(
        "https://www.linkedin.com/in/yogeshkumarasamy",
      );

      const githubLinks = screen.getAllByRole("link", { name: /github/i });
      expect(githubLinks[0]?.getAttribute("href")).toBe(
        "https://github.com/yogeshkumarasamy",
      );

      const mediumLinks = screen.getAllByRole("link", { name: /medium/i });
      expect(mediumLinks[0]?.getAttribute("href")).toBe(
        "https://medium.com/@yogeshkumarasamy",
      );
    });

    it("lists all 9 verified career roles in order without omission", () => {
      render(<ClassicView profile={verifiedProfileFixture} />);

      const expectedCompanies = [
        "FULL Creative",
        "Trimble Inc.",
        "Trimble Inc.",
        "BI WORLDWIDE",
        "BI WORLDWIDE",
        "Accenture",
        "Pearson English Business Solutions",
        "ISGN",
        "The Design Factory",
      ];

      for (const company of expectedCompanies) {
        expect(screen.getAllByText(new RegExp(company, "i")).length > 0).toBe(
          true,
        );
      }
    });

    it("displays verified open source project vitest-portfolio and excludes private workspace repo", () => {
      render(<ClassicView profile={verifiedProfileFixture} />);

      expect(
        Boolean(screen.getByRole("link", { name: /vitest-portfolio/i })),
      ).toBe(true);
      expect(
        Boolean(
          screen.getByText(
            /volume of browser test files to stress Vitest test runs and performance/i,
          ),
        ),
      ).toBe(true);

      // Guard: Private workspace repository MUST NOT be displayed
      expect(Boolean(screen.queryByText(/private workspace/i))).toBe(false);
    });

    it("displays verified technical article published on Medium", () => {
      render(<ClassicView profile={verifiedProfileFixture} />);

      const articleLink = screen.getByRole("link", {
        name: /How SSH Makes Managing Multiple Git Accounts Easy and Secure/i,
      });
      expect(Boolean(articleLink)).toBe(true);
      expect(articleLink.getAttribute("href")).toBe(
        "https://medium.com/full-creative-blog/how-ssh-makes-managing-multiple-git-accounts-easy-and-secure-1e9f43c8b071",
      );
      expect(Boolean(screen.getByText(/FULL Creative blog on Medium/i))).toBe(
        true,
      );
    });

    it("displays verified education (RVS College of Engineering & Technology)", () => {
      const { container } = render(
        <ClassicView profile={verifiedProfileFixture} />,
      );

      const eduSection = container.querySelector("#education") as HTMLElement;
      expect(
        Boolean(
          within(eduSection).getByText(
            /RVS College of Engineering and Technology/i,
          ),
        ),
      ).toBe(true);
      expect(
        Boolean(
          within(eduSection).getByText(/B.Tech., Information Technology/i),
        ),
      ).toBe(true);
      expect(Boolean(within(eduSection).getByText(/2008/))).toBe(true);
      expect(Boolean(within(eduSection).getByText(/2012/))).toBe(true);
    });

    it("renders custom bio and role bullets when provided", () => {
      const customProfile: Profile = {
        ...verifiedProfileFixture,
        about: "Custom bio provided by profile owner.",
        experience: [
          {
            company: "Test Corp",
            title: "Staff Engineer",
            start: "2024-01",
            end: null,
            location: "Remote",
            bullets: ["Delivered scalable systems", "Mentored team members"],
          },
        ],
      };

      render(<ClassicView profile={customProfile} />);

      expect(
        Boolean(screen.getByText("Custom bio provided by profile owner.")),
      ).toBe(true);
      expect(Boolean(screen.getByText("Delivered scalable systems"))).toBe(
        true,
      );
      expect(Boolean(screen.getByText("Mentored team members"))).toBe(true);
    });
  });
});
