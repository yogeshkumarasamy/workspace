import { test, expect } from "@playwright/test";

/**
 * Mobile Viewport E2E Tests.
 * Requirements (PRD §6):
 * - Mobile (< 768 px): no free dragging.
 * - Apps open full-screen as "cards" with a bottom dock.
 * - Terminal gets on-screen command chips.
 * - Banner offers Classic view.
 */
test.describe("Mobile Viewport Layout (< 768px)", () => {
  test.use({
    viewport: { width: 375, height: 667 }, // iPhone SE / standard mobile
  });

  test.beforeEach(async () => {
    test.fixme(
      true,
      "Mobile layout components awaiting S01/S03/S04 merge"
    );
  });

  test("displays banner offering switch to Classic view on mobile", async ({
    page,
  }) => {
    await page.goto("/#/");

    // Banner offering Classic view
    const banner = page.getByRole("banner");
    await expect(banner).toBeVisible();

    const classicLink = banner.getByRole("link", {
      name: /classic view/i,
    });
    await expect(classicLink).toBeVisible();
    await expect(classicLink).toHaveAttribute("href", "#/classic");
  });

  test("opens applications full-screen as cards with bottom dock", async ({
    page,
  }) => {
    await page.goto("/#/");

    // Click app icon to open
    const aboutIcon = page.getByRole("button", { name: /about/i });
    await aboutIcon.click();

    const aboutDialog = page.getByRole("dialog", { name: /about/i });
    await expect(aboutDialog).toBeVisible();

    // Verify window card fills viewport width
    const boundingBox = await aboutDialog.boundingBox();
    expect(boundingBox).not.toBeNull();
    if (boundingBox) {
      expect(boundingBox.width).toBeGreaterThanOrEqual(370);
    }
  });

  test("renders on-screen command chips in mobile terminal", async ({
    page,
  }) => {
    await page.goto("/#/");

    await page.getByRole("button", { name: /terminal/i }).click();
    const terminalDialog = page.getByRole("dialog", { name: /terminal/i });
    await expect(terminalDialog).toBeVisible();

    // Quick command chips available for touch input
    const helpChip = terminalDialog.getByRole("button", { name: "help" });
    await expect(helpChip).toBeVisible();

    await helpChip.click();

    const outputRegion = terminalDialog.locator('[aria-live="polite"]');
    await expect(outputRegion).toContainText("help");
  });
});
