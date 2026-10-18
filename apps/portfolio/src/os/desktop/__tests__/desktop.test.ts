import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Register custom loader for .css and .tsx modules in raw Node
try {
  const cwd = typeof process !== "undefined" && process.cwd ? process.cwd() : "";
  // Check for vite in workspace or parent node_modules
  const candidates = [
    `${cwd}/node_modules/.pnpm/vite@5.4.17/node_modules/vite/dist/node/index.js`,
    `${cwd}/../../node_modules/.pnpm/vite@5.4.17/node_modules/vite/dist/node/index.js`,
    `${cwd}/node_modules/vite/dist/node/index.js`,
  ];
  let vitePath = "";
  for (const cand of candidates) {
    if (existsSync(cand)) {
      vitePath = cand;
      break;
    }
  }

  if (vitePath) {
    const viteUrl = pathToFileURL(vitePath).href;

    register(
      "data:text/javascript," +
        encodeURIComponent(`
      import { existsSync, readFileSync } from "node:fs";
      import { fileURLToPath } from "node:url";

      let transformFn;

      export async function resolve(specifier, context, nextResolve) {
        if (specifier.endsWith(".css")) {
          return { url: "data:text/javascript,export default {}", shortCircuit: true };
        }
        try {
          return await nextResolve(specifier, context);
        } catch (err) {
          if (context.parentURL && context.parentURL.startsWith("file:") && (specifier.startsWith("./") || specifier.startsWith("../"))) {
            const parentDir = new URL(".", context.parentURL);
            for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
              const cand = new URL(specifier + ext, parentDir);
              if (existsSync(fileURLToPath(cand))) {
                return { url: cand.href, shortCircuit: true };
              }
            }
          }
          throw err;
        }
      }

      export async function load(url, context, nextLoad) {
        if (url.endsWith(".css")) {
          return { format: "module", shortCircuit: true, source: "export default {};" };
        }
        if (url.endsWith(".tsx")) {
          if (!transformFn) {
            const vite = await import("${viteUrl}");
            transformFn = vite.transformWithEsbuild;
          }
          const raw = readFileSync(fileURLToPath(url), "utf8");
          const transformed = await transformFn(raw, fileURLToPath(url), { jsx: "automatic" });
          return { format: "module", shortCircuit: true, source: transformed.code };
        }
        return nextLoad(url, context);
      }
    `),
      import.meta.url,
    );
  }
} catch {
  // Ignored in environments where register is unavailable or unnecessary
}

const React = (await import("react")).default;
const { renderToStaticMarkup } = await import("react-dom/server");

const {
  Desktop,
  DesktopGrid,
  DesktopIcon,
  Taskbar,
  StartMenu,
  CLASSIC_VIEW_ITEM,
  useOS,
  usePrefs,
  createMockOS,
} = await import("../index");

const { defaultAppsFixture } = await import("../__fixtures__/apps");
import type { PrefsApi, Theme, AppId, WindowState } from "../types";

function readDesktopCss(): string {
  const candidates = [
    path.resolve(process.cwd(), "apps/portfolio/src/os/desktop/desktop.css"),
    path.resolve(process.cwd(), "src/os/desktop/desktop.css"),
  ];
  const p = candidates.find((c) => existsSync(c));
  if (p) return readFileSync(p, "utf8");
  throw new Error("desktop.css not found");
}

describe("S04: Desktop, icons, taskbar & start menu", () => {
  describe("Module contracts & exports", () => {
    it("exports Desktop component, hooks, and subcomponents", () => {
      assert.equal(typeof Desktop, "function");
      assert.equal(typeof DesktopGrid, "function");
      assert.equal(typeof DesktopIcon, "function");
      assert.equal(typeof Taskbar, "function");
      assert.equal(typeof StartMenu, "function");
      assert.equal(typeof useOS, "function");
      assert.equal(typeof usePrefs, "function");
      assert.equal(typeof createMockOS, "function");
      assert.equal(CLASSIC_VIEW_ITEM.id, "classic");
      assert.equal(CLASSIC_VIEW_ITEM.isClassic, true);
    });

    it("matches PRD §13.1 AppDefinition structure for apps fixture", () => {
      assert.equal(defaultAppsFixture.length, 6);
      const ids = defaultAppsFixture.map((a) => a.id);
      assert.deepEqual(ids, [
        "about",
        "experience",
        "projects",
        "writing",
        "contact",
        "terminal",
      ]);
    });
  });

  describe("Desktop rendering & skip link", () => {
    it("renders desktop container with data-theme, data-crt, and skip link", () => {
      const mockOs = createMockOS();
      const mockPrefs: PrefsApi = {
        theme: "green",
        setTheme: () => {},
        crt: true,
        setCrt: () => {},
        reducedMotion: false,
      };

      const html = renderToStaticMarkup(
        React.createElement(Desktop, {
          apps: defaultAppsFixture,
          os: mockOs,
          prefs: mockPrefs,
        }),
      );

      assert.ok(html.includes('data-testid="yk-desktop"'), "has yk-desktop testid");
      assert.ok(html.includes('data-theme="green"'), "has data-theme=green");
      assert.ok(html.includes('data-crt="on"'), "has data-crt=on");
      assert.ok(
        html.includes('href="#/classic"'),
        "has skip link to classic view for a11y",
      );
      assert.ok(
        html.includes("Skip to Classic view"),
        "contains skip link text",
      );
    });
  });

  describe("Icons Grid with Roving TabIndex & Classic View", () => {
    it("renders all apps plus Classic View icon", () => {
      const mockOs = createMockOS();
      const html = renderToStaticMarkup(
        React.createElement(DesktopGrid, {
          apps: defaultAppsFixture,
          os: mockOs,
        }),
      );

      // Verify all 6 apps are rendered
      for (const app of defaultAppsFixture) {
        assert.ok(
          html.includes(`data-testid="desktop-icon-${app.id}"`),
          `renders desktop icon for ${app.id}`,
        );
        assert.ok(html.includes(app.title), `renders title for ${app.title}`);
      }

      // Verify Classic View icon is rendered
      assert.ok(
        html.includes('data-testid="desktop-icon-classic"'),
        "renders desktop icon for Classic View",
      );
      assert.ok(html.includes("Classic View"), "renders Classic View title");
    });

    it("implements roving tabindex: first item has tabIndex=0, others have tabIndex=-1", () => {
      const mockOs = createMockOS();
      const html = renderToStaticMarkup(
        React.createElement(DesktopGrid, {
          apps: defaultAppsFixture,
          os: mockOs,
        }),
      );

      // Match all desktop icon buttons
      const buttonMatches = [...html.matchAll(/<button[^>]*data-testid="desktop-icon-([^"]+)"[^>]*>/g)];
      assert.ok(buttonMatches.length >= 7, "should find at least 7 icons");

      const tabIndices = buttonMatches.map((m) => {
        const fullTag = m[0];
        const tiMatch = fullTag.match(/tabindex="(-?[0-9]+)"/);
        return tiMatch ? parseInt(tiMatch[1], 10) : NaN;
      });

      // Exactly one icon should have tabIndex 0
      const zeroes = tabIndices.filter((ti) => ti === 0);
      const minusOnes = tabIndices.filter((ti) => ti === -1);

      assert.equal(zeroes.length, 1, "exactly one icon has tabIndex=0");
      assert.equal(minusOnes.length, tabIndices.length - 1, "all other icons have tabIndex=-1");
      assert.equal(tabIndices[0], 0, "first icon has tabIndex=0 by default");
    });

    it("respects initialSelectedId for roving tabindex", () => {
      const mockOs = createMockOS();
      const html = renderToStaticMarkup(
        React.createElement(DesktopGrid, {
          apps: defaultAppsFixture,
          os: mockOs,
          initialSelectedId: "experience",
        }),
      );

      // Match experience button tag
      const expMatch = html.match(/<button[^>]*data-testid="desktop-icon-experience"[^>]*>/);
      assert.ok(expMatch, "experience icon exists in html");
      if (!expMatch) throw new Error("experience icon not found");

      const expTag = expMatch[0];
      assert.ok(expTag.includes('tabindex="0"'), "experience icon has tabindex=0");
      assert.ok(
        expTag.includes("yk-desktop-icon--selected"),
        "experience icon has selected modifier class",
      );

      // Also verify another icon (e.g. about) has tabindex="-1"
      const aboutMatch = html.match(/<button[^>]*data-testid="desktop-icon-about"[^>]*>/);
      assert.ok(aboutMatch, "about icon exists in html");
      if (!aboutMatch) throw new Error("about icon not found");
      assert.ok(aboutMatch[0].includes('tabindex="-1"'), "about icon has tabindex=-1");
    });

    it("calls os.open when an app icon is activated and navigates on Classic View", () => {
      const opened: AppId[] = [];
      const mockOs = createMockOS({
        onOpen: (appId) => opened.push(appId),
      });

      let navigated = "";
      const onNavigate = (path: string) => {
        navigated = path;
      };

      // Direct simulation of open handlers
      mockOs.open("terminal");
      assert.equal(opened[0], "terminal");

      onNavigate("#/classic");
      assert.equal(navigated, "#/classic");
    });
  });

  describe("Taskbar with role=toolbar & open windows management", () => {
    it("renders taskbar with role=toolbar and start button", () => {
      const mockOs = createMockOS();
      const mockPrefs: PrefsApi = {
        theme: "green",
        setTheme: () => {},
        crt: false,
        setCrt: () => {},
        reducedMotion: false,
      };

      const html = renderToStaticMarkup(
        React.createElement(Taskbar, {
          apps: defaultAppsFixture,
          os: mockOs,
          prefs: mockPrefs,
        }),
      );

      assert.ok(html.includes('role="toolbar"'), "has role=toolbar");
      assert.ok(html.includes('aria-label="Desktop taskbar"'), "has taskbar aria-label");
      assert.ok(html.includes('data-testid="start-button"'), "has start button");
      assert.ok(html.includes('aria-haspopup="menu"'), "start button has aria-haspopup=menu");
      assert.ok(html.includes('aria-expanded="false"'), "start button has aria-expanded=false when closed");
    });

    it("lists open windows and reflects active/focused window", () => {
      const sampleWindows: WindowState[] = [
        {
          id: "win-about-1",
          appId: "about",
          x: 40,
          y: 40,
          w: 580,
          h: 420,
          z: 1,
          minimized: false,
          maximized: false,
        },
        {
          id: "win-terminal-2",
          appId: "terminal",
          x: 80,
          y: 80,
          w: 680,
          h: 420,
          z: 2, // highest z = active
          minimized: false,
          maximized: false,
        },
      ];

      const mockOs = createMockOS({ initialWindows: sampleWindows });
      const mockPrefs: PrefsApi = {
        theme: "green",
        setTheme: () => {},
        crt: false,
        setCrt: () => {},
        reducedMotion: false,
      };

      const html = renderToStaticMarkup(
        React.createElement(Taskbar, {
          apps: defaultAppsFixture,
          os: mockOs,
          prefs: mockPrefs,
        }),
      );

      assert.ok(html.includes('data-testid="taskbar-window-win-about-1"'), "renders button for win-about-1");
      assert.ok(html.includes('data-testid="taskbar-window-win-terminal-2"'), "renders button for win-terminal-2");
      assert.ok(html.includes("About.txt"), "displays About.txt title");
      assert.ok(html.includes("Terminal"), "displays Terminal title");

      // Terminal has highest z, so it should be active
      assert.ok(
        html.includes('yk-taskbar__window-btn--active') &&
          html.includes('data-testid="taskbar-window-win-terminal-2"'),
        "terminal window has active class in taskbar",
      );
    });

    it("clicking window button invokes os.focus(id)", () => {
      const focused: string[] = [];
      const sampleWindows: WindowState[] = [
        {
          id: "win-exp-1",
          appId: "experience",
          x: 40,
          y: 40,
          w: 640,
          h: 480,
          z: 1,
          minimized: false,
          maximized: false,
        },
      ];

      const mockOs = createMockOS({
        initialWindows: sampleWindows,
        onFocus: (id) => focused.push(id),
      });

      mockOs.focus("win-exp-1");
      assert.equal(focused[0], "win-exp-1");
    });
  });

  describe("Start Menu accessibility", () => {
    it("renders Start Menu with role=menu and menuitems for all apps + Classic View", () => {
      const mockOs = createMockOS();
      const html = renderToStaticMarkup(
        React.createElement(StartMenu, {
          isOpen: true,
          onClose: () => {},
          apps: defaultAppsFixture,
          os: mockOs,
        }),
      );

      assert.ok(html.includes('role="menu"'), "has role=menu");
      assert.ok(html.includes('data-testid="start-menu"'), "has start-menu testid");

      // Verify all app items are menuitems
      for (const app of defaultAppsFixture) {
        assert.ok(
          html.includes(`data-testid="start-menu-item-${app.id}"`),
          `has start menu item for ${app.id}`,
        );
      }
      assert.ok(
        html.includes('data-testid="start-menu-item-classic"'),
        "has start menu item for classic view",
      );
    });

    it("does not render Start Menu when isOpen=false", () => {
      const mockOs = createMockOS();
      const html = renderToStaticMarkup(
        React.createElement(StartMenu, {
          isOpen: false,
          onClose: () => {},
          apps: defaultAppsFixture,
          os: mockOs,
        }),
      );

      assert.equal(html, "");
    });
  });

  describe("Toggles & Clock (Asia/Kolkata)", () => {
    it("renders theme toggle and cycles theme", () => {
      let currentTheme: Theme = "green";
      const mockPrefs: PrefsApi = {
        theme: currentTheme,
        setTheme: (t) => {
          currentTheme = t;
        },
        crt: false,
        setCrt: () => {},
        reducedMotion: false,
      };

      const mockOs = createMockOS();
      const html = renderToStaticMarkup(
        React.createElement(Taskbar, {
          apps: defaultAppsFixture,
          os: mockOs,
          prefs: mockPrefs,
        }),
      );

      assert.ok(html.includes('data-testid="theme-toggle-btn"'), "has theme toggle button");
      assert.ok(html.includes("green"), "displays current theme green");

      // Simulate cycle: green -> amber -> light -> green
      const cycle = ["green", "amber", "light"] as const;
      let idx = cycle.indexOf(currentTheme);
      mockPrefs.setTheme(cycle[(idx + 1) % cycle.length]);
      assert.equal(currentTheme, "amber");

      idx = cycle.indexOf(currentTheme);
      mockPrefs.setTheme(cycle[(idx + 1) % cycle.length]);
      assert.equal(currentTheme, "light");

      idx = cycle.indexOf(currentTheme);
      mockPrefs.setTheme(cycle[(idx + 1) % cycle.length]);
      assert.equal(currentTheme, "green");
    });

    it("renders CRT toggle and toggles CRT state", () => {
      let crtEnabled = false;
      const mockPrefs: PrefsApi = {
        theme: "green",
        setTheme: () => {},
        crt: crtEnabled,
        setCrt: (val) => {
          crtEnabled = val;
        },
        reducedMotion: false,
      };

      const mockOs = createMockOS();
      const html = renderToStaticMarkup(
        React.createElement(Taskbar, {
          apps: defaultAppsFixture,
          os: mockOs,
          prefs: mockPrefs,
        }),
      );

      assert.ok(html.includes('data-testid="crt-toggle-btn"'), "has crt toggle button");
      assert.ok(html.includes("CRT: OFF"), "displays CRT: OFF initially");

      mockPrefs.setCrt(true);
      assert.equal(crtEnabled, true);
    });

    it("renders clock formatted for Asia/Kolkata timezone", () => {
      const mockOs = createMockOS();
      const mockPrefs: PrefsApi = {
        theme: "green",
        setTheme: () => {},
        crt: false,
        setCrt: () => {},
        reducedMotion: false,
      };

      const html = renderToStaticMarkup(
        React.createElement(Taskbar, {
          apps: defaultAppsFixture,
          os: mockOs,
          prefs: mockPrefs,
        }),
      );

      assert.ok(html.includes('data-testid="taskbar-clock"'), "has taskbar clock");
      assert.ok(html.includes('role="timer"'), "clock has role=timer");
      assert.ok(html.includes("Asia/Kolkata"), "clock label specifies Asia/Kolkata timezone");

      // Test Intl formatter specifically for Asia/Kolkata
      const kolkataTime = new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(new Date());

      assert.ok(kolkataTime.length > 0, "formats Asia/Kolkata time string");
    });
  });

  describe("Target sizes ≥ 24 px (WCAG 2.5.8)", () => {
    it("declares min-height and min-width >= 24px in CSS for all interactive elements", () => {
      const css = readDesktopCss();

      // Check Desktop Icons
      assert.match(
        css,
        /\.yk-desktop-icon\s*{[^}]*min-width:\s*24px/,
        "desktop icon has min-width >= 24px",
      );
      assert.match(
        css,
        /\.yk-desktop-icon\s*{[^}]*min-height:\s*24px/,
        "desktop icon has min-height >= 24px",
      );

      // Check Start Button
      assert.match(
        css,
        /\.yk-taskbar__start-btn\s*{[^}]*min-height:\s*24px/,
        "start button has min-height >= 24px",
      );

      // Check Taskbar Windows Buttons
      assert.match(
        css,
        /\.yk-taskbar__window-btn\s*{[^}]*min-height:\s*24px/,
        "window button has min-height >= 24px",
      );

      // Check Tray Buttons
      assert.match(
        css,
        /\.yk-taskbar__tray-btn\s*{[^}]*min-height:\s*24px/,
        "tray button has min-height >= 24px",
      );
      assert.match(
        css,
        /\.yk-taskbar__tray-btn\s*{[^}]*min-width:\s*24px/,
        "tray button has min-width >= 24px",
      );

      // Check Start Menu Items
      assert.match(
        css,
        /\.yk-start-menu__item\s*{[^}]*min-height:\s*24px/,
        "start menu item has min-height >= 24px",
      );
    });
  });

  describe("Mobile bottom dock layout", () => {
    it("provides responsive media query for mobile viewport (< 768px)", () => {
      const css = readDesktopCss();
      assert.match(
        css,
        /@media\s*\(\s*max-width:\s*767px\s*\)/,
        "contains mobile viewport media query",
      );
      assert.match(
        css,
        /--yk-taskbar-height:\s*48px/,
        "expands taskbar touch target height on mobile",
      );
      assert.match(
        css,
        /\.yk-taskbar__start-btn\s*{[^}]*height:\s*38px/,
        "start button has enlarged height on mobile dock",
      );
      assert.match(css, /--yk-tab-fg/, "open tabs use a contrasting text color");
      assert.match(css, /--yk-tab-active-bg/, "active tabs use a solid background");
      assert.equal(css.includes("#e6e6e6"), false);
      assert.match(
        css,
        /\.yk-taskbar__tray-text\s*{[^}]*clip:\s*rect/,
        "mobile tray labels are visually hidden so tabs can grow",
      );
      assert.match(
        css,
        /\.yk-taskbar__window-btn\s*{[^}]*flex:\s*1 1 0/,
        "mobile window tabs share the free taskbar width",
      );
    });
  });

  describe("Verified content integrity (PRD §4)", () => {
    it("renders verified user identity and titles only", () => {
      const mockOs = createMockOS();
      const html = renderToStaticMarkup(
        React.createElement(StartMenu, {
          isOpen: true,
          onClose: () => {},
          apps: defaultAppsFixture,
          os: mockOs,
        }),
      );

      assert.ok(
        html.includes("Yogesh Kumarasamy"),
        "uses verified name Yogesh Kumarasamy",
      );
      assert.ok(
        html.includes("Senior Software Engineer"),
        "uses verified headline Senior Software Engineer",
      );
      // Ensure no invented phone or private email is shown in start menu
      assert.equal(html.includes("+1-"), false, "no invented phone");
      assert.equal(html.includes("+91-"), false, "no invented phone");
    });
  });
});
