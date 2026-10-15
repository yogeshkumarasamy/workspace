import { test, expect } from "@playwright/test";

/**
 * Boot Sequence E2E Tests.
 * Requirements (PRD §6):
 * - Boot: ≤ 2.5 s typed BIOS/POST lines, then desktop.
 * - Skip with any key/click/tap.
 * - Shown once per session (sessionStorage).
 * - Never shown with reduced motion, on #/classic, or to bots.
 */
test.describe("Boot Sequence (YK-OS)", () => {
  test.beforeEach(async () => {
    // Tests written against PRD specifications.
    // Flagged as fixme until S01/S05 (shell and boot) are merged into main.
    test.fixme(true, "Boot sequence component awaiting S01/S05 merge");
  });

  test("skips boot sequence on keyboard key press and presents desktop", async ({
    page,
  }) => {
    await page.goto("/#/");

    // Boot screen displays BIOS/POST lines
    const biosText = page.getByText(/YK-OS BIOS/i);
    await expect(biosText).toBeVisible();

    // Skip with any key
    await page.keyboard.press("Space");

    // Boot screen disappears and desktop environment displays
    await expect(biosText).not.toBeVisible();
    await expect(page.getByRole("toolbar")).toBeVisible();
  });

  test("skips boot sequence on pointer click", async ({ page }) => {
    await page.goto("/#/");

    const biosText = page.getByText(/YK-OS BIOS/i);
    await expect(biosText).toBeVisible();

    // Click anywhere on screen to skip
    await page.locator("body").click();

    await expect(biosText).not.toBeVisible();
    await expect(page.getByRole("toolbar")).toBeVisible();
  });

  test("skips boot sequence automatically under reduced motion preference", async ({
    page,
  }) => {
    // Emulate prefers-reduced-motion: reduce
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/#/");

    // Boot screen is bypassed entirely
    await expect(page.getByText(/YK-OS BIOS/i)).not.toBeVisible();
    await expect(page.getByRole("toolbar")).toBeVisible();
  });

  test("is shown only once per session via sessionStorage", async ({
    page,
  }) => {
    await page.goto("/#/");

    // Skip initial boot
    await page.keyboard.press("Enter");
    await expect(page.getByRole("toolbar")).toBeVisible();

    // Reload page in the same session
    await page.reload();

    // Boot screen should not be displayed again
    await expect(page.getByText(/YK-OS BIOS/i)).not.toBeVisible();
    await expect(page.getByRole("toolbar")).toBeVisible();
  });

  test("is never shown when directly navigating to #/classic", async ({
    page,
  }) => {
    await page.goto("/#/classic");

    // Boot screen should not be rendered on classic view
    await expect(page.getByText(/YK-OS BIOS/i)).not.toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: /Yogesh Kumarasamy/i })
    ).toBeVisible();
  });
});
