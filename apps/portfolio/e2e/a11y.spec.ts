import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Automated Accessibility Verification (Axe WCAG 2.2 AA).
 * Requirements (PRD §8):
 * - Axe has 0 serious/critical violations on both #/ and #/classic.
 * - WCAG 2.2 AA compliance.
 */
test.describe("Accessibility Audits (Axe WCAG 2.2 AA)", () => {
  test.beforeEach(async () => {
    test.fixme(
      true,
      "Retro application views awaiting S01-S14 merge"
    );
  });

  test("has 0 serious or critical accessibility violations on desktop view (#/)", async ({
    page,
  }) => {
    await page.goto("/#/");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    const seriousOrCritical = accessibilityScanResults.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical"
    );

    expect(seriousOrCritical).toEqual([]);
  });

  test("has 0 serious or critical accessibility violations on Classic view (#/classic)", async ({
    page,
  }) => {
    await page.goto("/#/classic");

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();

    const seriousOrCritical = accessibilityScanResults.violations.filter(
      (violation) =>
        violation.impact === "serious" || violation.impact === "critical"
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
