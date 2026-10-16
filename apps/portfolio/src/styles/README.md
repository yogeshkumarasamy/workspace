# Portfolio Retro Design Tokens, Themes & CRT Effect

This module is owned by **S02** (`apps/portfolio/src/styles/**` and `apps/portfolio/public/fonts/**`) as defined in [PRD §7, §9, §13](file:///specs/portfolio/retro/prd.md).

It provides:

- **Design Tokens**: All PRD §7 CSS custom properties for 3 themes (`green`, `amber`, `light`).
- **Typography**: Self-hosted subset woff2 fonts (`IBM Plex Mono` and `Pixelify Sans`) with `font-display: swap` and total size ≤ 60 KB.
- **CRT Effect**: `.yk-crt` overlay supporting scanlines, vignette curvature, opt-in flicker, and toggling via `data-crt="on|off"`.
- **Retro Utilities**: Pixel-accurate 3D bevels (`.yk-bevel-out`, `.yk-bevel-in`), tactile button (`.yk-btn`), and titlebar (`.yk-titlebar`).
- **Accessibility**: Full WCAG 2.2 AA compliance: all text/background pairs ≥ 4.5:1, focus indicators ≥ 3:1, full `prefers-reduced-motion: reduce` handling, and `prefers-contrast: more` auto-disabling of CRT scanlines.

---

## 1. Design Tokens (PRD §7)

All tokens are defined as CSS custom properties on `:root` and scoped to themes via `data-theme="green|amber|light"`:

| Category                | Token                | Description / Default Value                                     |
| ----------------------- | -------------------- | --------------------------------------------------------------- |
| **Typography**          | `--yk-font-mono`     | `"IBM Plex Mono", ui-monospace, monospace`                      |
|                         | `--yk-font-ui`       | `"Pixelify Sans", system-ui, sans-serif` (headings & titlebars) |
| **Color Tokens**        | `--yk-bg`            | Content / terminal / dialog background                          |
|                         | `--yk-fg`            | Primary foreground / body text                                  |
|                         | `--yk-accent`        | Highlights, links, and active accents                           |
|                         | `--yk-muted`         | Secondary / muted text (guaranteed ≥ 4.5:1 against surfaces)    |
|                         | `--yk-desktop`       | OS desktop wallpaper background                                 |
|                         | `--yk-window-bg`     | Window frame / container background                             |
|                         | `--yk-titlebar-bg`   | Window title bar background                                     |
|                         | `--yk-titlebar-fg`   | Window title bar label color                                    |
|                         | `--yk-bevel-light`   | Highlight edge for 3D bevels                                    |
|                         | `--yk-bevel-dark`    | Shadow edge for 3D bevels                                       |
|                         | `--yk-focus`         | Focus indicator outline (guaranteed ≥ 3:1 vs adjacent)          |
|                         | `--yk-danger`        | Alert / error / destructive actions (guaranteed ≥ 4.5:1)        |
| **Spacing (4px scale)** | `--yk-space-1`       | `4px`                                                           |
|                         | `--yk-space-2`       | `8px`                                                           |
|                         | `--yk-space-3`       | `12px`                                                          |
|                         | `--yk-space-4`       | `16px`                                                          |
|                         | `--yk-space-5`       | `20px`                                                          |
|                         | `--yk-space-6`       | `24px`                                                          |
| **Borders & Radii**     | `--yk-radius`        | `0` (retro sharp corners)                                       |
| **Elevation**           | `--yk-shadow-window` | `2px 2px 0 rgba(0, 0, 0, 0.8)`                                  |
| **Z-Indices**           | `--yk-z-desktop`     | `1`                                                             |
|                         | `--yk-z-window`      | `10`                                                            |
|                         | `--yk-z-taskbar`     | `100`                                                           |
|                         | `--yk-z-overlay`     | `1000` (CRT overlay)                                            |
|                         | `--yk-z-boot`        | `10000` (Boot sequence)                                         |

---

## 2. Themes & Color Contrast Ratios (WCAG 2.2 AA)

WCAG 2.2 AA requires a minimum contrast ratio of **4.5:1** for regular text against its background, and **3.0:1** for user interface components and focus indicators.

Every text and interactive combination across all three themes has been tested and meets or exceeds these criteria.

### 2.1 Theme 1: Green Phosphor (`data-theme="green"` — Default)

Monochrome phosphor green CRT aesthetic with deep black/green chassis.

| Color Token        | Hex Code  | Role                            |
| ------------------ | --------- | ------------------------------- |
| `--yk-bg`          | `#081008` | Terminal / app interior surface |
| `--yk-window-bg`   | `#0c180c` | Window chrome background        |
| `--yk-desktop`     | `#040804` | Desktop wallpaper               |
| `--yk-fg`          | `#33ff33` | Classic phosphor green text     |
| `--yk-accent`      | `#66ff66` | Vibrant neon accent             |
| `--yk-muted`       | `#82e076` | Softer phosphor text            |
| `--yk-titlebar-bg` | `#144214` | Titlebar background             |
| `--yk-titlebar-fg` | `#ebffeb` | Titlebar text                   |
| `--yk-bevel-light` | `#246e24` | Raised highlight border         |
| `--yk-bevel-dark`  | `#040a04` | Sunken shadow border            |
| `--yk-focus`       | `#33ff33` | Keyboard focus ring             |
| `--yk-danger`      | `#ff5555` | Alert / danger red              |

#### Contrast Ratio Measurements (Green Theme)

| Foreground                     | Background                     | Calculated Ratio | WCAG AA Requirement | Status |
| ------------------------------ | ------------------------------ | ---------------- | ------------------- | ------ |
| `--yk-fg` (`#33ff33`)          | `--yk-bg` (`#081008`)          | **14.24:1**      | ≥ 4.5:1             | PASS   |
| `--yk-fg` (`#33ff33`)          | `--yk-window-bg` (`#0c180c`)   | **13.45:1**      | ≥ 4.5:1             | PASS   |
| `--yk-accent` (`#66ff66`)      | `--yk-bg` (`#081008`)          | **14.76:1**      | ≥ 4.5:1             | PASS   |
| `--yk-accent` (`#66ff66`)      | `--yk-window-bg` (`#0c180c`)   | **13.95:1**      | ≥ 4.5:1             | PASS   |
| `--yk-muted` (`#82e076`)       | `--yk-bg` (`#081008`)          | **11.83:1**      | ≥ 4.5:1             | PASS   |
| `--yk-muted` (`#82e076`)       | `--yk-window-bg` (`#0c180c`)   | **11.18:1**      | ≥ 4.5:1             | PASS   |
| `--yk-titlebar-fg` (`#ebffeb`) | `--yk-titlebar-bg` (`#144214`) | **11.01:1**      | ≥ 4.5:1             | PASS   |
| `--yk-danger` (`#ff5555`)      | `--yk-bg` (`#081008`)          | **6.14:1**       | ≥ 4.5:1             | PASS   |
| `--yk-danger` (`#ff5555`)      | `--yk-window-bg` (`#0c180c`)   | **5.80:1**       | ≥ 4.5:1             | PASS   |
| `--yk-focus` (`#33ff33`)       | `--yk-bg` (`#081008`)          | **14.24:1**      | ≥ 3.0:1             | PASS   |
| `--yk-focus` (`#33ff33`)       | `--yk-window-bg` (`#0c180c`)   | **13.45:1**      | ≥ 3.0:1             | PASS   |

---

### 2.2 Theme 2: Amber Phosphor (`data-theme="amber"`)

Warm monochrome amber CRT terminal aesthetic (VT220 / IBM 3151 style).

| Color Token        | Hex Code  | Role                            |
| ------------------ | --------- | ------------------------------- |
| `--yk-bg`          | `#120a02` | Terminal / app interior surface |
| `--yk-window-bg`   | `#180e03` | Window chrome background        |
| `--yk-desktop`     | `#0a0501` | Desktop wallpaper               |
| `--yk-fg`          | `#ffb000` | Phosphor amber text             |
| `--yk-accent`      | `#ffd04d` | Bright gold accent              |
| `--yk-muted`       | `#dfa144` | Warm muted text                 |
| `--yk-titlebar-bg` | `#4a2800` | Titlebar background             |
| `--yk-titlebar-fg` | `#fff2dc` | Titlebar text                   |
| `--yk-bevel-light` | `#7e4600` | Raised highlight border         |
| `--yk-bevel-dark`  | `#090400` | Sunken shadow border            |
| `--yk-focus`       | `#ffb000` | Keyboard focus ring             |
| `--yk-danger`      | `#ff5544` | Amber alert red                 |

#### Contrast Ratio Measurements (Amber Theme)

| Foreground                     | Background                     | Calculated Ratio | WCAG AA Requirement | Status |
| ------------------------------ | ------------------------------ | ---------------- | ------------------- | ------ |
| `--yk-fg` (`#ffb000`)          | `--yk-bg` (`#120a02`)          | **10.71:1**      | ≥ 4.5:1             | PASS   |
| `--yk-fg` (`#ffb000`)          | `--yk-window-bg` (`#180e03`)   | **10.39:1**      | ≥ 4.5:1             | PASS   |
| `--yk-accent` (`#ffd04d`)      | `--yk-bg` (`#120a02`)          | **13.44:1**      | ≥ 4.5:1             | PASS   |
| `--yk-accent` (`#ffd04d`)      | `--yk-window-bg` (`#180e03`)   | **13.04:1**      | ≥ 4.5:1             | PASS   |
| `--yk-muted` (`#dfa144`)       | `--yk-bg` (`#120a02`)          | **8.71:1**       | ≥ 4.5:1             | PASS   |
| `--yk-muted` (`#dfa144`)       | `--yk-window-bg` (`#180e03`)   | **8.45:1**       | ≥ 4.5:1             | PASS   |
| `--yk-titlebar-fg` (`#fff2dc`) | `--yk-titlebar-bg` (`#4a2800`) | **11.91:1**      | ≥ 4.5:1             | PASS   |
| `--yk-danger` (`#ff5544`)      | `--yk-bg` (`#120a02`)          | **6.20:1**       | ≥ 4.5:1             | PASS   |
| `--yk-danger` (`#ff5544`)      | `--yk-window-bg` (`#180e03`)   | **6.02:1**       | ≥ 4.5:1             | PASS   |
| `--yk-focus` (`#ffb000`)       | `--yk-bg` (`#120a02`)          | **10.71:1**      | ≥ 3.0:1             | PASS   |
| `--yk-focus` (`#ffb000`)       | `--yk-window-bg` (`#180e03`)   | **10.39:1**      | ≥ 3.0:1             | PASS   |

---

### 2.3 Theme 3: Light (`data-theme="light"`)

Classic 90s graphical OS aesthetic (Win95 / Mac OS System 7 beige and teal desktop).

| Color Token        | Hex Code  | Role                            |
| ------------------ | --------- | ------------------------------- |
| `--yk-bg`          | `#ffffff` | Clean document / editor surface |
| `--yk-window-bg`   | `#c0c0c0` | Classic 90s chassis gray        |
| `--yk-desktop`     | `#008080` | Classic 90s teal wallpaper      |
| `--yk-fg`          | `#111111` | Near-black body text            |
| `--yk-accent`      | `#000080` | Classic OS navy blue            |
| `--yk-muted`       | `#3d3d3d` | Dark gray secondary text        |
| `--yk-titlebar-bg` | `#000080` | Active window navy titlebar     |
| `--yk-titlebar-fg` | `#ffffff` | Crisp white titlebar text       |
| `--yk-bevel-light` | `#ffffff` | Pure white highlight edge       |
| `--yk-bevel-dark`  | `#808080` | Dark gray shadow edge           |
| `--yk-focus`       | `#000080` | Navy focus outline              |
| `--yk-danger`      | `#8b0000` | Deep red alert                  |

#### Contrast Ratio Measurements (Light Theme)

| Foreground                     | Background                     | Calculated Ratio | WCAG AA Requirement | Status |
| ------------------------------ | ------------------------------ | ---------------- | ------------------- | ------ |
| `--yk-fg` (`#111111`)          | `--yk-bg` (`#ffffff`)          | **18.88:1**      | ≥ 4.5:1             | PASS   |
| `--yk-fg` (`#111111`)          | `--yk-window-bg` (`#c0c0c0`)   | **10.38:1**      | ≥ 4.5:1             | PASS   |
| `--yk-accent` (`#000080`)      | `--yk-bg` (`#ffffff`)          | **16.01:1**      | ≥ 4.5:1             | PASS   |
| `--yk-accent` (`#000080`)      | `--yk-window-bg` (`#c0c0c0`)   | **8.80:1**       | ≥ 4.5:1             | PASS   |
| `--yk-muted` (`#3d3d3d`)       | `--yk-bg` (`#ffffff`)          | **10.86:1**      | ≥ 4.5:1             | PASS   |
| `--yk-muted` (`#3d3d3d`)       | `--yk-window-bg` (`#c0c0c0`)   | **5.97:1**       | ≥ 4.5:1             | PASS   |
| `--yk-titlebar-fg` (`#ffffff`) | `--yk-titlebar-bg` (`#000080`) | **16.01:1**      | ≥ 4.5:1             | PASS   |
| `--yk-danger` (`#8b0000`)      | `--yk-bg` (`#ffffff`)          | **10.01:1**      | ≥ 4.5:1             | PASS   |
| `--yk-danger` (`#8b0000`)      | `--yk-window-bg` (`#c0c0c0`)   | **5.50:1**       | ≥ 4.5:1             | PASS   |
| `--yk-focus` (`#000080`)       | `--yk-bg` (`#ffffff`)          | **16.01:1**      | ≥ 3.0:1             | PASS   |
| `--yk-focus` (`#000080`)       | `--yk-window-bg` (`#c0c0c0`)   | **8.80:1**       | ≥ 3.0:1             | PASS   |

---

## 3. Typography & Font Budget (PRD §7, §9)

The fonts are self-hosted in `public/fonts/` as subset `.woff2` files:

1. `apps/portfolio/public/fonts/ibm-plex-mono-400.woff2` (10,052 bytes / ~9.8 KB)
2. `apps/portfolio/public/fonts/pixelify-sans-latin.woff2` (12,008 bytes / ~11.7 KB)

**Total Font Size**: `22,060 bytes (~21.5 KB)`  
**Budget (PRD §9)**: `≤ 60 KB total` (passes comfortably with > 38 KB headroom).

Both `@font-face` declarations specify `font-display: swap;` ensuring immediate text rendering without FOIT (Flash of Invisible Text).

---

## 4. CRT Overlay (`.yk-crt`)

The CRT overlay renders full-screen scanlines and vignette shading via pseudo-elements with `pointer-events: none` and `z-index: var(--yk-z-overlay)`:

- **Scanlines**: Created using a repeating `linear-gradient` (`background-size: 100% 4px`).
- **Vignette**: Radial gradient darkening edges to emulate curved cathode ray tubes.
- **Flicker**: Disabled by default. Can be enabled via `.yk-crt--flicker` or `[data-flicker="on"]`.
- **Toggle**: Fully hidden (`display: none !important`) when `data-crt="off"` is set on `<html>`, `<body>`, or the container.

### Accessibility Safeguards:

- **`prefers-reduced-motion: reduce`**: Disables all animations and transitions (`animation: none !important; transition: none !important;`).
- **`prefers-contrast: more`**: Disables the `.yk-crt` overlay entirely to maximize text sharpness and contrast.

---

## 5. Utility Classes (PRD §13 Contracts)

- `.yk-bevel-out`: 3D raised border using `--yk-bevel-light` and `--yk-bevel-dark`.
- `.yk-bevel-in`: 3D sunken border for inputs, text areas, and recessed panels.
- `.yk-btn`: Retro pushbutton with tactile `:active` state (inverts bevel, 1px text shift), accessible focus ring (`outline: 2px dotted var(--yk-focus)`), and min size ≥ 24px.
- `.yk-titlebar`: Window titlebar styled with `--yk-font-ui`, flex layout, and `--yk-titlebar-bg` / `--yk-titlebar-fg`.

---

## 6. CSS Bundle Budget (PRD §9)

- **Uncompressed**: ~10.5 KB
- **Gzip**: **~2.6 KB**
- **Budget (PRD §9)**: `≤ 20 KB gzip` (passes with ~17.4 KB headroom).
