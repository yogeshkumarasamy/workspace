import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import writingApp, {
  formatArticleDate,
  verifiedArticles,
  verifiedMediumUrl,
} from "../index";
import { WritingApp } from "../WritingApp";
import { profile } from "../../../content/profile";

describe("Writing App", () => {
  describe("AppDefinition contract", () => {
    it("exports default AppDefinition with id 'writing' and order 4", () => {
      expect(writingApp.id).toBe("writing");
      expect(writingApp.order).toBe(4);
      expect(writingApp.title).toBe("Writing/");
      expect(writingApp.icon).toBe("📰");
      expect(writingApp.defaultSize.w).toBe(600);
      expect(writingApp.defaultSize.h).toBe(440);
      expect(typeof writingApp.component).toBe("object");
    });
  });

  describe("Verified content integrity (PRD §4)", () => {
    it("contains exactly the verified articles without invented facts", () => {
      expect(verifiedArticles.length).toBe(1);
      const article = verifiedArticles[0];
      expect(article.title).toBe(
        "How SSH Makes Managing Multiple Git Accounts Easy and Secure",
      );
      expect(article.publication).toBe("FULL Creative blog on Medium");
      expect(article.date).toBe("2025-04-17");
      expect(article.href).toBe(
        "https://medium.com/full-creative-blog/how-ssh-makes-managing-multiple-git-accounts-easy-and-secure-1e9f43c8b071",
      );
    });

    it("matches the profile.writing verified content", () => {
      expect(profile.writing.length).toBe(verifiedArticles.length);
      expect(profile.writing[0].title).toBe(verifiedArticles[0].title);
      expect(profile.writing[0].publication).toBe(verifiedArticles[0].publication);
      expect(profile.writing[0].date).toBe(verifiedArticles[0].date);
      expect(profile.writing[0].href).toBe(verifiedArticles[0].href);
      expect(profile.links.medium).toBe(verifiedMediumUrl);
    });

    it("has valid verified Medium profile link", () => {
      expect(verifiedMediumUrl).toBe("https://medium.com/@yogeshkumarasamy");
    });
  });

  describe("Date formatting (formatArticleDate)", () => {
    it("formats ISO date string into Month Day, Year", () => {
      expect(formatArticleDate("2025-04-17")).toBe("Apr 17, 2025");
      expect(formatArticleDate("2024-01-01")).toBe("Jan 1, 2024");
      expect(formatArticleDate("2026-12-31")).toBe("Dec 31, 2026");
    });

    it("formats ISO year-month string into Month Year", () => {
      expect(formatArticleDate("2025-04")).toBe("Apr 2025");
    });

    it("returns year as-is if only year provided", () => {
      expect(formatArticleDate("2025")).toBe("2025");
    });

    it("safely handles empty or non-date inputs", () => {
      expect(formatArticleDate("")).toBe("");
      expect(formatArticleDate("invalid-date")).toBe("invalid-date");
    });
  });

  describe("Component Rendering", () => {
    it("renders the writing app container and heading", () => {
      render(<WritingApp />);
      expect(Boolean(screen.getByTestId("writing-app"))).toBe(true);
      expect(
        Boolean(screen.getByRole("heading", { level: 2, name: /Writing\//i })),
      ).toBe(true);
    });

    it("lists profile.writing with publication and <time> date", () => {
      render(<WritingApp />);

      // Check article title
      const articleLink = screen.getByRole("link", {
        name: /How SSH Makes Managing Multiple Git Accounts Easy and Secure/i,
      });
      expect(Boolean(articleLink)).toBe(true);
      expect(articleLink.getAttribute("href")).toBe(
        "https://medium.com/full-creative-blog/how-ssh-makes-managing-multiple-git-accounts-easy-and-secure-1e9f43c8b071",
      );
      expect(articleLink.getAttribute("target")).toBe("_blank");
      expect(articleLink.getAttribute("rel")).toContain("noopener");

      // Check publication name
      expect(Boolean(screen.getByText("FULL Creative blog on Medium"))).toBe(
        true,
      );

      // Check <time> element with date
      const timeElement = screen.getByText("Apr 17, 2025");
      expect(timeElement.tagName.toLowerCase()).toBe("time");
      expect(timeElement.getAttribute("dateTime")).toBe("2025-04-17");
    });

    it("renders a link to Medium profile", () => {
      render(<WritingApp />);

      const mediumLink = screen.getByTestId("medium-profile-link");
      expect(Boolean(mediumLink)).toBe(true);
      expect(mediumLink.getAttribute("href")).toBe(
        "https://medium.com/@yogeshkumarasamy",
      );
      expect(mediumLink.getAttribute("target")).toBe("_blank");
      expect(mediumLink.getAttribute("rel")).toContain("noopener");
    });

    it("handles empty articles list gracefully", () => {
      render(<WritingApp articles={[]} />);

      expect(Boolean(screen.getByTestId("writing-empty"))).toBe(true);
      expect(
        Boolean(screen.getByText(/No articles found in directory/i)),
      ).toBe(true);
      expect(screen.getByTestId("writing-count").textContent).toContain("0 articles");
    });

    it("renders custom articles list when provided", () => {
      const customArticles = [
        {
          title: "Custom Article 1",
          publication: "Test Tech Blog",
          date: "2024-06-15",
          href: "https://example.com/custom-1",
        },
      ];

      render(<WritingApp articles={customArticles} />);

      const link = screen.getByRole("link", { name: /Custom Article 1/i });
      expect(link.getAttribute("href")).toBe("https://example.com/custom-1");
      expect(Boolean(screen.getByText("Test Tech Blog"))).toBe(true);

      const timeElement = screen.getByText("Jun 15, 2024");
      expect(timeElement.tagName.toLowerCase()).toBe("time");
      expect(timeElement.getAttribute("dateTime")).toBe("2024-06-15");
    });
  });
});
