import { test, expect } from "@playwright/test";

/**
 * Window Management & Keyboard Accessibility E2E Tests.
 * Requirements (PRD §8):
 * - Desktop icons: roving tabindex grid, Enter/Double-click opens icon.
 * - Every window: role="dialog" (non-modal), aria-labelledby title.
 * - Focus moves into window on open and returns to icon on close.
 * - Esc closes focused window.
 * - Alt+Tab-style cycling via Ctrl+`.
 * - Taskbar is role="toolbar".
 */
test.describe("Window Management & Keyboard Navigation", () => {
  test.beforeEach(async () => {
    test.fixme(
      true,
      "Window manager and desktop components awaiting S01/S03/S04 merge"
    );
  });

  test("opens window dialog via keyboard Enter and focuses window content", async ({
    page,
  }) => {
    await page.goto("/#/");

    // Find and focus the Experience app icon in the desktop grid
    const experienceIcon = page.getByRole("button", { name: /experience/i });
    await experienceIcon.focus();
    await expect(experienceIcon).toBeFocused();

    // Open via Enter
    await page.keyboard.press("Enter");

    // Window must be a non-modal dialog with accessible name matching title
    const windowDialog = page.getByRole("dialog", { name: /experience/i });
    await expect(windowDialog).toBeVisible();

    // Focus must move inside the opened window
    const focusedInside = await windowDialog.evaluate((dialog) =>
      dialog.contains(document.activeElement)
    );
    expect(focusedInside).toBe(true);
  });

  test("closes focused window via Escape key and restores focus to opening icon", async ({
    page,
  }) => {
    await page.goto("/#/");

    const aboutIcon = page.getByRole("button", { name: /about/i });
    await aboutIcon.focus();
    await page.keyboard.press("Enter");

    const windowDialog = page.getByRole("dialog", { name: /about/i });
    await expect(windowDialog).toBeVisible();

    // Close window using Escape key
    await page.keyboard.press("Escape");
    await expect(windowDialog).not.toBeVisible();

    // Focus must return to opening icon
    await expect(aboutIcon).toBeFocused();
  });

  test("cycles through open windows using Ctrl+` keyboard shortcut", async ({
    page,
  }) => {
    await page.goto("/#/");

    // Open first window (About)
    const aboutIcon = page.getByRole("button", { name: /about/i });
    await aboutIcon.click();
    const aboutDialog = page.getByRole("dialog", { name: /about/i });
    await expect(aboutDialog).toBeVisible();

    // Open second window (Projects)
    const projectsIcon = page.getByRole("button", { name: /projects/i });
    await projectsIcon.click();
    const projectsDialog = page.getByRole("dialog", { name: /projects/i });
    await expect(projectsDialog).toBeVisible();

    // Cycle focus to previous window using Ctrl+`
    await page.keyboard.press("Control+Backquote");

    const activeInAbout = await aboutDialog.evaluate((dialog) =>
      dialog.contains(document.activeElement)
    );
    expect(activeInAbout).toBe(true);
  });

  test("taskbar presents role=toolbar with open window items", async ({
    page,
  }) => {
    await page.goto("/#/");

    const taskbar = page.getByRole("toolbar");
    await expect(taskbar).toBeVisible();

    // Open Experience app
    await page.getByRole("button", { name: /experience/i }).click();

    // Taskbar should contain an item/button representing the active window
    const taskbarItem = taskbar.getByRole("button", { name: /experience/i });
    await expect(taskbarItem).toBeVisible();
  });
});
