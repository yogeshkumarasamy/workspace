/**
 * Portfolio Retro Design Tokens
 * Part of workspace#28 (S02)
 *
 * Implements PRD §7 tokens, §6 retro UX, and §13.1 contracts.
 */

export type Theme = "green" | "amber" | "light";

export interface ThemeColors {
  bg: string;
  fg: string;
  accent: string;
  muted: string;
  desktop: string;
  windowBg: string;
  titlebarBg: string;
  titlebarFg: string;
  bevelLight: string;
  bevelDark: string;
  focus: string;
  danger: string;
}

export interface SharedTokens {
  fontMono: string;
  fontUi: string;
  space1: string;
  space2: string;
  space3: string;
  space4: string;
  space5: string;
  space6: string;
  radius: string;
  shadowWindow: string;
  zDesktop: number;
  zWindow: number;
  zTaskbar: number;
  zOverlay: number;
  zBoot: number;
}

export const SHARED_TOKENS: SharedTokens = {
  fontMono: '"IBM Plex Mono", ui-monospace, monospace',
  fontUi: '"Pixelify Sans", system-ui, sans-serif',
  space1: "4px",
  space2: "8px",
  space3: "12px",
  space4: "16px",
  space5: "20px",
  space6: "24px",
  radius: "0",
  shadowWindow: "2px 2px 0 rgba(0, 0, 0, 0.6)",
  zDesktop: 1,
  zWindow: 10,
  zTaskbar: 100,
  zOverlay: 1000,
  zBoot: 10000,
};

export const THEME_PALETTES: Record<Theme, ThemeColors> = {
  green: {
    bg: "#081008",
    fg: "#33ff33",
    accent: "#66ff66",
    muted: "#82e076",
    desktop: "#040804",
    windowBg: "#0c180c",
    titlebarBg: "#144214",
    titlebarFg: "#ebffeb",
    bevelLight: "#246e24",
    bevelDark: "#040a04",
    focus: "#33ff33",
    danger: "#ff5555",
  },
  amber: {
    bg: "#120a02",
    fg: "#ffb000",
    accent: "#ffd04d",
    muted: "#dfa144",
    desktop: "#0a0501",
    windowBg: "#180e03",
    titlebarBg: "#4a2800",
    titlebarFg: "#fff2dc",
    bevelLight: "#7e4600",
    bevelDark: "#090400",
    focus: "#ffb000",
    danger: "#ff5544",
  },
  light: {
    bg: "#ffffff",
    fg: "#111111",
    accent: "#000080",
    muted: "#3d3d3d",
    desktop: "#008080",
    windowBg: "#c0c0c0",
    titlebarBg: "#000080",
    titlebarFg: "#ffffff",
    bevelLight: "#ffffff",
    bevelDark: "#808080",
    focus: "#000080",
    danger: "#8b0000",
  },
};

/**
 * All 27 §7 CSS custom property keys
 */
export const SECTION_7_TOKEN_KEYS = [
  "--yk-font-mono",
  "--yk-font-ui",
  "--yk-bg",
  "--yk-fg",
  "--yk-accent",
  "--yk-muted",
  "--yk-desktop",
  "--yk-window-bg",
  "--yk-titlebar-bg",
  "--yk-titlebar-fg",
  "--yk-bevel-light",
  "--yk-bevel-dark",
  "--yk-focus",
  "--yk-danger",
  "--yk-space-1",
  "--yk-space-2",
  "--yk-space-3",
  "--yk-space-4",
  "--yk-space-5",
  "--yk-space-6",
  "--yk-radius",
  "--yk-shadow-window",
  "--yk-z-desktop",
  "--yk-z-window",
  "--yk-z-taskbar",
  "--yk-z-overlay",
  "--yk-z-boot",
] as const;

export type Section7TokenKey = (typeof SECTION_7_TOKEN_KEYS)[number];

/**
 * Standard utility classes provided by S02
 */
export const UTILITY_CLASSES = [
  "yk-bevel-out",
  "yk-bevel-in",
  "yk-btn",
  "yk-titlebar",
  "yk-crt",
] as const;

export type UtilityClass = (typeof UTILITY_CLASSES)[number];

/**
 * Relative luminance of an RGB tuple per WCAG 2.1
 */
function channelLuminance(c: number): number {
  const norm = c / 255;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const expanded =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = parseInt(expanded, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function getRelativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

/**
 * Contrast ratio between two hex colors per WCAG 2.1
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
