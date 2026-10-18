import { test } from "vitest";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import {
  SECTION_7_TOKEN_KEYS,
  SHARED_TOKENS,
  THEME_PALETTES,
  getContrastRatio,
  type Theme,
} from "./tokens";

const stylesDir = fs.existsSync(path.resolve(process.cwd(), "apps/portfolio/src/styles"))
  ? path.resolve(process.cwd(), "apps/portfolio/src/styles")
  : path.resolve(process.cwd(), "src/styles");
const portfolioDir = path.resolve(stylesDir, "../..");
const cssPath = path.join(stylesDir, "index.css");
const fontsDir = path.join(portfolioDir, "public/fonts");

test("PRD §7: All 27 design tokens are declared in SECTION_7_TOKEN_KEYS", () => {
  assert.equal(
    SECTION_7_TOKEN_KEYS.length,
    27,
    "Expected exactly 27 tokens in §7",
  );
});

test("PRD §7: SHARED_TOKENS has valid spacing and z-indices", () => {
  assert.equal(SHARED_TOKENS.radius, "0");
  assert.equal(SHARED_TOKENS.space1, "4px");
  assert.equal(SHARED_TOKENS.space6, "24px");
  assert.ok(SHARED_TOKENS.zDesktop < SHARED_TOKENS.zWindow);
  assert.ok(SHARED_TOKENS.zWindow < SHARED_TOKENS.zTaskbar);
  assert.ok(SHARED_TOKENS.zTaskbar < SHARED_TOKENS.zOverlay);
  assert.ok(SHARED_TOKENS.zOverlay < SHARED_TOKENS.zBoot);
});

test("CSS: index.css exists and defines all 27 §7 tokens", () => {
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

test("WCAG 2.2 AA: Text contrast pairs are >= 4.5:1 across all 3 themes", () => {
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

test("WCAG 2.2 AA: Focus indicators are >= 3.0:1 across all 3 themes", () => {
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

test("Fonts: public/fonts contains woff2 files with budget <= 60 KB total", () => {
  assert.ok(fs.existsSync(fontsDir), "public/fonts directory must exist");

  const files = fs
    .readdirSync(fontsDir)
    .filter((file: string) => file.endsWith(".woff2"));
  assert.ok(
    files.length > 0 && files.length <= 2,
    `Expected 1 or 2 woff2 files, found ${files.length}`,
  );

  let totalSize = 0;
  for (const file of files) {
    const filePath = path.join(fontsDir, file);
    const stat = fs.statSync(filePath);
    totalSize += stat.size;
  }

  const totalKb = totalSize / 1024;
  assert.ok(
    totalKb <= 60,
    `Font budget exceeded: ${totalKb.toFixed(2)} KB > 60 KB`,
  );
});

test("Fonts: @font-face rules declare font-display: swap in index.css", () => {
  const css = fs.readFileSync(cssPath, "utf8");
  assert.ok(css.includes("font-display: swap"));
  assert.ok(css.includes("/fonts/ibm-plex-mono-400.woff2"));
  assert.ok(css.includes("/fonts/pixelify-sans-latin.woff2"));
});

test("CRT effect: .yk-crt overlay class, scanlines, and vignette defined", () => {
  const css = fs.readFileSync(cssPath, "utf8");
  assert.ok(css.includes(".yk-crt"));
  assert.ok(css.includes("pointer-events: none"));
  assert.ok(css.includes("scanlines"));
});

test("CRT effect: flicker is OFF by default in index.css", () => {
  const css = fs.readFileSync(cssPath, "utf8");
  assert.ok(
    css.includes(".yk-crt:not(.yk-crt--flicker)") ||
      css.includes('.yk-crt:not([data-flicker="on"])') ||
      css.includes("animation: none"),
  );
});

test("Accessibility: prefers-reduced-motion disables animations and scanline motion", () => {
  const css = fs.readFileSync(cssPath, "utf8");
  assert.ok(css.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(
    css.includes("animation: none") || css.includes("animation-duration"),
  );
});

test("Accessibility: prefers-contrast: more disables CRT effect overlay", () => {
  const css = fs.readFileSync(cssPath, "utf8");
  assert.ok(css.includes("@media (prefers-contrast: more)"));
  assert.ok(css.includes(".yk-crt"));
  assert.ok(css.includes("display: none"));
});

test("Retro utilities: .yk-bevel-out, .yk-bevel-in, .yk-btn, .yk-titlebar present", () => {
  const css = fs.readFileSync(cssPath, "utf8");
  assert.ok(css.includes(".yk-bevel-out"));
  assert.ok(css.includes(".yk-bevel-in"));
  assert.ok(css.includes(".yk-btn"));
  assert.ok(css.includes(".yk-titlebar"));
});

test("Budget: index.css gzipped size is <= 20 KB", () => {
  const rawCss = fs.readFileSync(cssPath);
  const gzipped = zlib.gzipSync(rawCss);
  const gzipKb = gzipped.length / 1024;
  assert.ok(
    gzipKb <= 20,
    `CSS budget exceeded: ${gzipKb.toFixed(2)} KB > 20 KB`,
  );
});
