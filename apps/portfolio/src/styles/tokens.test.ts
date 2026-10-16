import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import type { Theme } from "./tokens";

const stylesDir = fileURLToPath(new URL(".", import.meta.url));
const portfolioDir = path.resolve(stylesDir, "../..");
const cssPath = path.join(stylesDir, "index.css");
const fontsDir = path.join(portfolioDir, "public/fonts");

async function loadTokens() {
  const tokenModuleUrl = new URL("./tokens.ts", import.meta.url).href;
  return await import(tokenModuleUrl);
}

test("PRD §7: All 27 design tokens are declared in SECTION_7_TOKEN_KEYS", async () => {
  const { SECTION_7_TOKEN_KEYS } = await loadTokens();
  assert.equal(
    SECTION_7_TOKEN_KEYS.length,
    27,
    "Expected exactly 27 tokens in §7",
  );
});

test("PRD §7: SHARED_TOKENS has valid spacing and z-indices", async () => {
  const { SHARED_TOKENS } = await loadTokens();
  assert.equal(SHARED_TOKENS.radius, "0");
  assert.equal(SHARED_TOKENS.space1, "4px");
  assert.equal(SHARED_TOKENS.space6, "24px");
  assert.ok(SHARED_TOKENS.zDesktop < SHARED_TOKENS.zWindow);
  assert.ok(SHARED_TOKENS.zWindow < SHARED_TOKENS.zTaskbar);
  assert.ok(SHARED_TOKENS.zTaskbar < SHARED_TOKENS.zOverlay);
  assert.ok(SHARED_TOKENS.zOverlay < SHARED_TOKENS.zBoot);
});

test("CSS: index.css exists and defines all 27 §7 tokens", async () => {
  const { SECTION_7_TOKEN_KEYS } = await loadTokens();
  assert.ok(fs.existsSync(cssPath), "index.css must exist");
  const css = fs.readFileSync(cssPath, "utf8");

  for (const token of SECTION_7_TOKEN_KEYS) {
    assert.ok(
      css.includes(token),
      `index.css must contain CSS custom property: ${token}`,
    );
  }
});

test("Themes: All 3 themes (green, amber, light) are defined in index.css", () => {
  const css = fs.readFileSync(cssPath, "utf8");
  const themes: Theme[] = ["green", "amber", "light"];

  for (const theme of themes) {
    assert.ok(
      css.includes(`[data-theme="${theme}"]`),
      `index.css must define selector for [data-theme="${theme}"]`,
    );
  }
});

test("WCAG 2.2 AA: Text contrast pairs are >= 4.5:1 across all 3 themes", async () => {
  const { THEME_PALETTES, getContrastRatio } = await loadTokens();
  const themes: Theme[] = ["green", "amber", "light"];

  for (const theme of themes) {
    const palette = THEME_PALETTES[theme];

    const pairs = [
      { name: "fg on bg", fg: palette.fg, bg: palette.bg },
      { name: "fg on windowBg", fg: palette.fg, bg: palette.windowBg },
      { name: "accent on bg", fg: palette.accent, bg: palette.bg },
      { name: "accent on windowBg", fg: palette.accent, bg: palette.windowBg },
      { name: "muted on bg", fg: palette.muted, bg: palette.bg },
      { name: "muted on windowBg", fg: palette.muted, bg: palette.windowBg },
      {
        name: "titlebarFg on titlebarBg",
        fg: palette.titlebarFg,
        bg: palette.titlebarBg,
      },
      { name: "danger on bg", fg: palette.danger, bg: palette.bg },
      { name: "danger on windowBg", fg: palette.danger, bg: palette.windowBg },
    ];

    for (const { name, fg, bg } of pairs) {
      const ratio = getContrastRatio(fg, bg);
      assert.ok(
        ratio >= 4.5,
        `Theme ${theme} pair '${name}' failed contrast check: ${ratio.toFixed(2)}:1 < 4.5:1 (fg: ${fg}, bg: ${bg})`,
      );
    }
  }
});

test("WCAG 2.2 AA: Focus indicators are >= 3.0:1 across all 3 themes", async () => {
  const { THEME_PALETTES, getContrastRatio } = await loadTokens();
  const themes: Theme[] = ["green", "amber", "light"];

  for (const theme of themes) {
    const palette = THEME_PALETTES[theme];
    const focusRatioBg = getContrastRatio(palette.focus, palette.bg);
    const focusRatioWindowBg = getContrastRatio(
      palette.focus,
      palette.windowBg,
    );

    assert.ok(
      focusRatioBg >= 3.0,
      `Theme ${theme} focus vs bg ratio ${focusRatioBg.toFixed(2)}:1 < 3.0:1`,
    );
    assert.ok(
      focusRatioWindowBg >= 3.0,
      `Theme ${theme} focus vs windowBg ratio ${focusRatioWindowBg.toFixed(2)}:1 < 3.0:1`,
    );
  }
});

test("Fonts: Self-hosted woff2 files exist and total size <= 60 KB", () => {
  assert.ok(fs.existsSync(fontsDir), "public/fonts directory must exist");
  const files = fs
    .readdirSync(fontsDir)
    .filter((f: string) => f.endsWith(".woff2"));

  assert.ok(files.length >= 2, "Must contain at least 2 woff2 font files");

  let totalBytes = 0;
  for (const f of files) {
    const size = fs.statSync(path.join(fontsDir, f)).size;
    assert.ok(size > 0, `Font file ${f} must not be empty`);
    totalBytes += size;
  }

  assert.ok(
    totalBytes <= 60 * 1024,
    `Total font size ${totalBytes} bytes exceeds 60 KB budget`,
  );
});

test("Fonts: @font-face declarations include font-display: swap", () => {
  const css = fs.readFileSync(cssPath, "utf8");
  const fontFaceBlocks = css.match(/@font-face\s*\{[^}]+\}/g) || [];

  assert.ok(
    fontFaceBlocks.length >= 2,
    "Expected at least 2 @font-face declarations",
  );
  for (const block of fontFaceBlocks) {
    assert.ok(
      block.includes("font-display: swap"),
      `Font-face block missing 'font-display: swap':\n${block}`,
    );
  }
});

test("Utility Classes: All required utilities (.yk-bevel-out, .yk-bevel-in, .yk-btn, .yk-titlebar, .yk-crt) exist", async () => {
  const { UTILITY_CLASSES } = await loadTokens();
  const css = fs.readFileSync(cssPath, "utf8");

  for (const cls of UTILITY_CLASSES) {
    assert.ok(
      css.includes(`.${cls}`),
      `index.css must define utility class: .${cls}`,
    );
  }
});

test("CRT Effect: Flicker off by default and disabled under reduced motion", () => {
  const css = fs.readFileSync(cssPath, "utf8");

  // Check default .yk-crt doesn't animate
  const crtRuleMatch = css.match(/\.yk-crt\s*\{([^}]+)\}/);
  assert.ok(crtRuleMatch, ".yk-crt selector must exist");
  assert.ok(
    crtRuleMatch && !crtRuleMatch[1].includes("animation:"),
    ".yk-crt must not have animation enabled by default",
  );

  // Check flicker is opt-in
  assert.ok(
    css.includes(".yk-crt--flicker") || css.includes('[data-flicker="on"]'),
    "Opt-in flicker class or data-flicker attribute must be present",
  );

  // Check data-crt="off" disables overlay
  assert.ok(
    css.includes('[data-crt="off"]'),
    "Must support data-crt='off' to disable overlay",
  );

  // Check reduced motion media query disables animation
  assert.ok(
    css.includes("prefers-reduced-motion: reduce"),
    "Must include prefers-reduced-motion: reduce media query",
  );

  // Check prefers-contrast: more disables CRT overlay
  assert.ok(
    css.includes("prefers-contrast: more"),
    "Must include prefers-contrast: more media query",
  );
});

test("Performance Budget: index.css <= 20 KB gzip", () => {
  const css = fs.readFileSync(cssPath);
  const gzipped = zlib.gzipSync(css);

  assert.ok(
    gzipped.length <= 20 * 1024,
    `index.css gzip size (${gzipped.length} bytes) exceeds 20 KB budget`,
  );
});

test("README.md: Exists and documents contrast ratios and tokens", () => {
  const readmePath = path.join(stylesDir, "README.md");
  assert.ok(fs.existsSync(readmePath), "README.md must exist in src/styles/");
  const readme = fs.readFileSync(readmePath, "utf8");

  assert.ok(readme.includes("WCAG 2.2 AA"), "README must mention WCAG 2.2 AA");
  assert.ok(
    readme.includes("4.5:1"),
    "README must document the 4.5:1 contrast requirement",
  );
  assert.ok(
    readme.includes("Green Phosphor"),
    "README must document Green theme",
  );
  assert.ok(
    readme.includes("Amber Phosphor"),
    "README must document Amber theme",
  );
  assert.ok(readme.includes("Light"), "README must document Light theme");
});
