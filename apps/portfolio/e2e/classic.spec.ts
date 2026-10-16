import { test, expect } from "@playwright/test";
import { verifiedProfile } from "./fixtures/profile";

/**
 * Classic View (#/classic) E2E Tests.
 * Requirements (PRD §4, §5, §8):
 * - Canonical accessible rendering of all content.
 * - Single semantic page: header, about, experience, projects, writing, skills, education, contact.
 * - Uses verified content only (never invent facts).
 * - Skip link "Skip to Classic view" as first focusable element.
 */
test.describe("Classic View Content & Semantic Structure", () => {
  test.beforeEach(async () => {
    test.fixme(
      true,
      "Classic view component awaiting S01/S13 merge"
    );
  });

  test("renders verified profile header, headline, and location", async ({
    page,
  }) => {
    await page.goto("/#/classic");

    // Main header with name
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toHaveText(new RegExp(verifiedProfile.name, "i"));

    // Headline and location
    await expect(page.getByText(verifiedProfile.headline)).toBeVisible();
    await expect(page.getByText(verifiedProfile.location)).toBeVisible();
  });

  test("renders all verified work experiences in chronological order", async ({
    page,
  }) => {
    await page.goto("/#/classic");

    // Check all verified employers are present
    for (const role of verifiedProfile.experience) {
      await expect(
        page.getByRole("heading", { name: new RegExp(role.company, "i") })
      ).toBeVisible();
      await expect(
        page.getByText(new RegExp(role.title, "i")).first()
      ).toBeVisible();
    }
  });

  test("renders verified projects and technical writing without invented facts", async ({
    page,
  }) => {
    await page.goto("/#/classic");

    // Projects: vitest-portfolio
    const project = verifiedProfile.projects[0];
    const projectLink = page.getByRole("link", {
      name: new RegExp(project.name, "i"),
    });
    await expect(projectLink).toBeVisible();
    await expect(projectLink).toHaveAttribute("href", project.href);

    // Writing: SSH article
    const article = verifiedProfile.writing[0];
    const articleLink = page.getByRole("link", {
      name: new RegExp(article.title, "i"),
    });
    await expect(articleLink).toBeVisible();
    await expect(articleLink).toHaveAttribute("href", article.href);
  });

  test("renders verified education, skills, and contact email", async ({
    page,
  }) => {
    await page.goto("/#/classic");

    // Education
    const education = verifiedProfile.education[0];
    await expect(page.getByText(education.institution)).toBeVisible();

    // Top skills
    for (const skill of verifiedProfile.skills) {
      await expect(page.getByText(skill, { exact: true })).toBeVisible();
    }

    // Contact email link
    const emailLink = page.getByRole("link", {
      name: new RegExp(verifiedProfile.email, "i"),
    });
    await expect(emailLink).toBeVisible();
    await expect(emailLink).toHaveAttribute(
      "href",
      `mailto:${verifiedProfile.email}`
    );
  });

  test("has accessible skip link to Classic view on desktop root route", async ({
    page,
  }) => {
    await page.goto("/#/");

    // First focusable element must be skip link to Classic view
    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", {
      name: /skip to classic view/i,
    });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveAttribute("href", "#/classic");
  });
});
