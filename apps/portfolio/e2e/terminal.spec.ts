import { test, expect } from "@playwright/test";

/**
 * Terminal Application E2E Tests.
 * Requirements (PRD §6):
 * - Prompt: yogesh@yk-os:~$
 * - Commands: help, whoami, about, experience, projects, writing, contact, skills, open <app>, etc.
 * - Output region: aria-live="polite".
 * - Unknown command -> command not found: x. Try 'help'.
 * - Runs 'open experience' to launch Experience window.
 */
test.describe("Terminal Application", () => {
  test.beforeEach(async () => {
    test.fixme(
      true,
      "Terminal component awaiting S01/S06 merge"
    );
  });

  test("displays prompt and responds to 'help' command with aria-live output", async ({
    page,
  }) => {
    await page.goto("/#/");

    // Open terminal from desktop icon
    await page.getByRole("button", { name: /terminal/i }).click();

    const terminalDialog = page.getByRole("dialog", { name: /terminal/i });
    await expect(terminalDialog).toBeVisible();

    // Verify prompt
    await expect(terminalDialog.getByText("yogesh@yk-os:~$")).toBeVisible();

    // Locate terminal input textbox
    const terminalInput = terminalDialog.getByRole("textbox");
    await terminalInput.fill("help");
    await page.keyboard.press("Enter");

    // Live polite region should receive help command summaries
    const outputRegion = terminalDialog.locator('[aria-live="polite"]');
    await expect(outputRegion).toContainText("help");
    await expect(outputRegion).toContainText("open <app>");
    await expect(outputRegion).toContainText("experience");
  });

  test("runs 'open experience' command to launch the Experience window dialog", async ({
    page,
  }) => {
    await page.goto("/#/");

    // Open terminal
    await page.getByRole("button", { name: /terminal/i }).click();
    const terminalDialog = page.getByRole("dialog", { name: /terminal/i });
    await expect(terminalDialog).toBeVisible();

    // Type 'open experience' and submit
    const terminalInput = terminalDialog.getByRole("textbox");
    await terminalInput.fill("open experience");
    await page.keyboard.press("Enter");

    // Experience window dialog should now be open
    const experienceDialog = page.getByRole("dialog", {
      name: /experience/i,
    });
    await expect(experienceDialog).toBeVisible();
  });

  test("shows helpful error on unknown command", async ({ page }) => {
    await page.goto("/#/");

    await page.getByRole("button", { name: /terminal/i }).click();
    const terminalDialog = page.getByRole("dialog", { name: /terminal/i });

    const terminalInput = terminalDialog.getByRole("textbox");
    await terminalInput.fill("invalidcmd");
    await page.keyboard.press("Enter");

    const outputRegion = terminalDialog.locator('[aria-live="polite"]');
    await expect(outputRegion).toContainText(
      "command not found: invalidcmd. Try 'help'"
    );
  });
});
