import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { register } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";

// Custom loader to transpile .ts, .tsx, and stub .css in raw Node
try {
  const cwd = typeof process !== "undefined" && process.cwd ? process.cwd() : "";
  const candidates = [
    `${cwd}/node_modules/.pnpm/vite@5.4.17/node_modules/vite/dist/node/index.js`,
    `${cwd}/../../node_modules/.pnpm/vite@5.4.17/node_modules/vite/dist/node/index.js`,
    `${cwd}/node_modules/vite/dist/node/index.js`,
    `${cwd}/apps/portfolio/node_modules/vite/dist/node/index.js`,
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
          if (
            context.parentURL &&
            context.parentURL.startsWith("file:") &&
            (specifier.startsWith("./") || specifier.startsWith("../"))
          ) {
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
        if (url.endsWith(".tsx") || (url.endsWith(".ts") && !url.includes("node_modules"))) {
          if (!transformFn) {
            const vite = await import("${viteUrl}");
            transformFn = vite.transformWithEsbuild;
          }
          const raw = readFileSync(fileURLToPath(url), "utf8");
          const transformed = await transformFn(raw, fileURLToPath(url), {
            jsx: "automatic",
            loader: url.endsWith(".tsx") ? "tsx" : "ts",
          });
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
  WindowManagerProvider,
  Window,
  WindowLayer,
  useOS,
  useWindowManager,
  windowManagerReducer,
  clampToViewport,
  createInitialState,
  CASCADE_BASE_X,
  CASCADE_BASE_Y,
  CASCADE_OFFSET,
  CASCADE_CYCLE,
} = await import("../index");

const { sampleAppsFixture } = await import("../__fixtures__/apps");
import type { AppId, WindowState } from "../types";

function readWindowCss(): string {
  const cssPath = fileURLToPath(new URL("../window-manager.css", import.meta.url));
  return readFileSync(cssPath, "utf8");
}

describe("Window Manager (S03 · workspace#29)", () => {
  describe("1. Reducer Unit Tests (open, cascade, focus, z-order, close, minimise, maximise, reopen)", () => {
    it("creates initial state with empty windows", () => {
      const state = createInitialState();
      assert.deepEqual(state.windows, []);
      assert.equal(state.cascadeCounter, 0);
      assert.equal(state.focusedWindowId, null);
    });

    it("creates initial state with provided windows and finds top window", () => {
      const initialWindows: WindowState[] = [
        {
          id: "win-about",
          appId: "about",
          x: 40,
          y: 40,
          w: 500,
          h: 400,
          z: 1,
          minimized: false,
          maximized: false,
        },
        {
          id: "win-experience",
          appId: "experience",
          x: 68,
          y: 68,
          w: 600,
          h: 450,
          z: 3,
          minimized: false,
          maximized: false,
        },
        {
          id: "win-contact",
          appId: "contact",
          x: 96,
          y: 96,
          w: 400,
          h: 300,
          z: 2,
          minimized: false,
          maximized: false,
        },
      ];
      const state = createInitialState(initialWindows);
      assert.equal(state.windows.length, 3);
      assert.equal(state.cascadeCounter, 3);
      assert.equal(state.focusedWindowId, "win-experience");
    });

    it("OPEN action: creates a new window with correct id, size, z-order and sets focus", () => {
      let state = createInitialState();
      state = windowManagerReducer(state, {
        type: "OPEN",
        appId: "about",
        defaultSize: { w: 560, h: 420 },
      });

      assert.equal(state.windows.length, 1);
      const win = state.windows[0];
      assert.equal(win.id, "win-about");
      assert.equal(win.appId, "about");
      assert.equal(win.w, 560);
      assert.equal(win.h, 420);
      assert.equal(win.x, CASCADE_BASE_X);
      assert.equal(win.y, CASCADE_BASE_Y);
      assert.equal(win.z, 1);
      assert.equal(win.minimized, false);
      assert.equal(win.maximized, false);
      assert.equal(state.focusedWindowId, "win-about");
      assert.equal(state.cascadeCounter, 1);
    });

    it("CASCADE: consecutive OPEN actions increment coordinates diagonally", () => {
      let state = createInitialState();
      state = windowManagerReducer(state, { type: "OPEN", appId: "about" });
      state = windowManagerReducer(state, { type: "OPEN", appId: "experience" });
      state = windowManagerReducer(state, { type: "OPEN", appId: "projects" });

      assert.equal(state.windows.length, 3);
      assert.equal(state.windows[0].x, CASCADE_BASE_X);
      assert.equal(state.windows[0].y, CASCADE_BASE_Y);

      assert.equal(state.windows[1].x, CASCADE_BASE_X + CASCADE_OFFSET);
      assert.equal(state.windows[1].y, CASCADE_BASE_Y + CASCADE_OFFSET);

      assert.equal(state.windows[2].x, CASCADE_BASE_X + 2 * CASCADE_OFFSET);
      assert.equal(state.windows[2].y, CASCADE_BASE_Y + 2 * CASCADE_OFFSET);

      // Verify cycle wrap
      let cycleState = createInitialState();
      for (let i = 0; i < CASCADE_CYCLE; i++) {
        cycleState = windowManagerReducer(cycleState, {
          type: "OPEN",
          appId: `app-${i}` as unknown as AppId,
        });
      }
      assert.equal(cycleState.cascadeCounter, CASCADE_CYCLE);
      // The next window wraps to step 0
      cycleState = windowManagerReducer(cycleState, {
        type: "OPEN",
        appId: "terminal",
      });
      const terminalWin = cycleState.windows.find((w) => w.appId === "terminal");
      assert.ok(terminalWin);
      if (!terminalWin) throw new Error("terminalWin missing");
      assert.equal(terminalWin.x, CASCADE_BASE_X);
      assert.equal(terminalWin.y, CASCADE_BASE_Y);
    });

    it("REOPEN focuses existing: opening already open window does not duplicate and brings it to front", () => {
      let state = createInitialState();
      state = windowManagerReducer(state, { type: "OPEN", appId: "about" });
      state = windowManagerReducer(state, { type: "OPEN", appId: "experience" });

      assert.equal(state.windows.length, 2);
      assert.equal(state.focusedWindowId, "win-experience");

      // Reopen "about"
      state = windowManagerReducer(state, { type: "OPEN", appId: "about" });
      assert.equal(state.windows.length, 2); // No duplicate!
      assert.equal(state.focusedWindowId, "win-about");

      const aboutWin = state.windows.find((w) => w.appId === "about");
      const expWin = state.windows.find((w) => w.appId === "experience");
      assert.ok(aboutWin && expWin);
      if (!aboutWin || !expWin) throw new Error("aboutWin or expWin missing");
      assert.ok(aboutWin.z > expWin.z, "about window brought to top z-order");
    });

    it("REOPEN un-minimizes: opening a minimized window restores visibility and focuses it", () => {
      let state = createInitialState();
      state = windowManagerReducer(state, { type: "OPEN", appId: "about" });
      state = windowManagerReducer(state, { type: "MINIMIZE", id: "win-about" });

      assert.equal(state.windows[0].minimized, true);

      // Reopen "about"
      state = windowManagerReducer(state, { type: "OPEN", appId: "about" });
      assert.equal(state.windows.length, 1);
      assert.equal(state.windows[0].minimized, false, "minimized flag cleared");
      assert.equal(state.focusedWindowId, "win-about");
    });

    it("FOCUS: elevates target window z-index and un-minimizes if needed", () => {
      let state = createInitialState();
      state = windowManagerReducer(state, { type: "OPEN", appId: "about" });
      state = windowManagerReducer(state, { type: "OPEN", appId: "experience" });
      state = windowManagerReducer(state, { type: "OPEN", appId: "projects" });

      const initialAboutZ = state.windows.find((w) => w.id === "win-about")!.z;
      const initialProjectsZ = state.windows.find((w) => w.id === "win-projects")!.z;
      assert.ok(initialProjectsZ > initialAboutZ);

      // Focus "about"
      state = windowManagerReducer(state, { type: "FOCUS", id: "win-about" });
      const updatedAboutZ = state.windows.find((w) => w.id === "win-about")!.z;
      assert.ok(updatedAboutZ > initialProjectsZ, "about window z is now highest");
      assert.equal(state.focusedWindowId, "win-about");
    });

    it("CLOSE: removes window and transfers focus to next highest z-order window", () => {
      let state = createInitialState();
      state = windowManagerReducer(state, { type: "OPEN", appId: "about" });
      state = windowManagerReducer(state, { type: "OPEN", appId: "experience" });
      state = windowManagerReducer(state, { type: "OPEN", appId: "projects" });

      assert.equal(state.focusedWindowId, "win-projects");

      // Close top window "win-projects"
      state = windowManagerReducer(state, { type: "CLOSE", id: "win-projects" });
      assert.equal(state.windows.length, 2);
      assert.equal(state.windows.some((w) => w.id === "win-projects"), false);
      assert.equal(state.focusedWindowId, "win-experience", "focus moved to experience");

      // Close "win-experience"
      state = windowManagerReducer(state, { type: "CLOSE", id: "win-experience" });
      assert.equal(state.windows.length, 1);
      assert.equal(state.focusedWindowId, "win-about", "focus moved to about");

      // Close last window
      state = windowManagerReducer(state, { type: "CLOSE", id: "win-about" });
      assert.equal(state.windows.length, 0);
      assert.equal(state.focusedWindowId, null);
    });

    it("MINIMISE: sets minimized: true and updates focusedWindowId to next active window", () => {
      let state = createInitialState();
      state = windowManagerReducer(state, { type: "OPEN", appId: "about" });
      state = windowManagerReducer(state, { type: "OPEN", appId: "experience" });

      assert.equal(state.focusedWindowId, "win-experience");

      state = windowManagerReducer(state, { type: "MINIMIZE", id: "win-experience" });
      const expWin = state.windows.find((w) => w.id === "win-experience");
      assert.equal(expWin?.minimized, true);
      assert.equal(state.focusedWindowId, "win-about", "focus shifted to un-minimized window");
    });

    it("MAXIMISE: toggles maximized state, un-minimizes and brings to front", () => {
      let state = createInitialState();
      state = windowManagerReducer(state, { type: "OPEN", appId: "about" });
      state = windowManagerReducer(state, { type: "OPEN", appId: "experience" });

      // Maximize about
      state = windowManagerReducer(state, { type: "MAXIMIZE", id: "win-about" });
      let aboutWin = state.windows.find((w) => w.id === "win-about");
      assert.equal(aboutWin?.maximized, true);
      assert.equal(aboutWin?.minimized, false);
      assert.equal(state.focusedWindowId, "win-about");

      // Toggle maximize again (restore)
      state = windowManagerReducer(state, { type: "MAXIMIZE", id: "win-about" });
      aboutWin = state.windows.find((w) => w.id === "win-about");
      assert.equal(aboutWin?.maximized, false);
    });

    it("RESTORE: resets maximized and minimized to false", () => {
      let state = createInitialState();
      state = windowManagerReducer(state, { type: "OPEN", appId: "about" });
      state = windowManagerReducer(state, { type: "MAXIMIZE", id: "win-about" });
      state = windowManagerReducer(state, { type: "RESTORE", id: "win-about" });

      const aboutWin = state.windows.find((w) => w.id === "win-about");
      assert.equal(aboutWin?.maximized, false);
      assert.equal(aboutWin?.minimized, false);
    });

    it("MOVE & RESIZE: updates window coordinates and dimensions", () => {
      let state = createInitialState();
      state = windowManagerReducer(state, { type: "OPEN", appId: "terminal" });

      state = windowManagerReducer(state, {
        type: "MOVE",
        id: "win-terminal",
        x: 120,
        y: 150,
      });
      let win = state.windows.find((w) => w.id === "win-terminal");
      assert.equal(win?.x, 120);
      assert.equal(win?.y, 150);

      state = windowManagerReducer(state, {
        type: "RESIZE",
        id: "win-terminal",
        w: 700,
        h: 500,
      });
      win = state.windows.find((w) => w.id === "win-terminal");
      assert.equal(win?.w, 700);
      assert.equal(win?.h, 500);
    });

    it("clampToViewport: constrains window coordinates within viewport bounds", () => {
      const viewport = { w: 1024, h: 768 };
      const winW = 600;
      const winH = 400;

      // Normal within bounds
      let clamped = clampToViewport(100, 100, winW, winH, viewport);
      assert.equal(clamped.x, 100);
      assert.equal(clamped.y, 100);

      // Negative coordinates clamped to 0
      clamped = clampToViewport(-50, -30, winW, winH, viewport);
      assert.equal(clamped.x, 0);
      assert.equal(clamped.y, 0);

      // Coordinates exceeding viewport clamped so window stays visible
      clamped = clampToViewport(800, 600, winW, winH, viewport);
      assert.equal(clamped.x, 1024 - winW); // 424
      assert.equal(clamped.y, 768 - winH); // 368
    });
  });

  describe("2. Accessibility (role=dialog, aria-labelledby, target sizes >= 24px, Esc closes)", () => {
    it("renders window with role=dialog, aria-modal=false, and matching aria-labelledby", () => {
      const sampleState: WindowState = {
        id: "win-about-1",
        appId: "about",
        x: 50,
        y: 50,
        w: 600,
        h: 400,
        z: 1,
        minimized: false,
        maximized: false,
      };

      const html = renderToStaticMarkup(
        React.createElement(
          WindowManagerProvider,
          null,
          React.createElement(
            Window,
            { state: sampleState, title: "About Yogesh" },
            React.createElement("p", null, "Hello retro world"),
          ),
        ),
      );

      assert.ok(html.includes('role="dialog"'), "has role=dialog");
      assert.ok(html.includes('aria-modal="false"'), "has aria-modal=false (non-modal)");
      assert.ok(
        html.includes('aria-labelledby="yk-win-title-win-about-1"'),
        "has aria-labelledby pointing to title element id",
      );
      assert.ok(
        html.includes('id="yk-win-title-win-about-1"'),
        "has matching title element with correct id",
      );
      assert.ok(html.includes("About Yogesh"), "contains window title text");
      assert.ok(html.includes("Hello retro world"), "contains window content");
    });

    it("renders title bar controls with accessible labels and testids", () => {
      const sampleState: WindowState = {
        id: "win-projects-1",
        appId: "projects",
        x: 40,
        y: 40,
        w: 640,
        h: 480,
        z: 2,
        minimized: false,
        maximized: false,
      };

      const html = renderToStaticMarkup(
        React.createElement(
          WindowManagerProvider,
          null,
          React.createElement(
            Window,
            { state: sampleState, title: "Projects" },
            React.createElement("div", null, "Projects list"),
          ),
        ),
      );

      assert.ok(html.includes('data-testid="window-titlebar"'), "has titlebar testid");
      assert.ok(html.includes('data-testid="window-btn-minimize"'), "has minimize button");
      assert.ok(html.includes('data-testid="window-btn-maximize"'), "has maximize button");
      assert.ok(html.includes('data-testid="window-btn-close"'), "has close button");
      assert.ok(html.includes('aria-label="Minimize Projects"'), "has minimize aria-label");
      assert.ok(html.includes('aria-label="Maximize Projects"'), "has maximize aria-label");
      assert.ok(html.includes('aria-label="Close Projects"'), "has close aria-label");
    });

    it("meets WCAG 2.5.8 target size >= 24px in CSS for all titlebar control buttons", () => {
      const css = readWindowCss();

      assert.match(
        css,
        /\.yk-window__btn\s*{[^}]*min-width:\s*24px/,
        "control button has min-width >= 24px",
      );
      assert.match(
        css,
        /\.yk-window__btn\s*{[^}]*min-height:\s*24px/,
        "control button has min-height >= 24px",
      );
      assert.match(
        css,
        /\.yk-window__titlebar\s*{[^}]*min-height:\s*24px/,
        "titlebar has min-height >= 24px",
      );
    });

    it("includes focus ring styling and move mode indicator in CSS", () => {
      const css = readWindowCss();

      assert.match(
        css,
        /\.yk-window__btn:focus-visible\s*{[^}]*outline:\s*2px/,
        "control button has visible focus outline",
      );
      assert.match(
        css,
        /\.yk-window__titlebar:focus-visible\s*{[^}]*outline:\s*2px/,
        "titlebar has visible focus outline",
      );
      assert.match(
        css,
        /\.yk-window__titlebar--move-mode\s*{[^}]*outline:\s*2px dashed/,
        "move mode visual indicator defined",
      );
    });
  });

  describe("3. Mobile (< 768px): full screen, no free drag", () => {
    it("declares responsive full-screen CSS and disables maximize button under 768px", () => {
      const css = readWindowCss();

      assert.match(
        css,
        /@media\s*\(\s*max-width:\s*767px\s*\)/,
        "contains mobile breakpoint < 768px",
      );
      assert.match(
        css,
        /\.yk-window\s*{[^}]*position:\s*fixed\s*!important/,
        "window is fixed position on mobile",
      );
      assert.match(
        css,
        /\.yk-window\s*{[^}]*width:\s*100vw\s*!important/,
        "window width is 100vw on mobile",
      );
      assert.match(
        css,
        /\.yk-window__titlebar\s*{[^}]*cursor:\s*default\s*!important/,
        "titlebar cursor is default (no drag cursor) on mobile",
      );
      assert.match(
        css,
        /\.yk-window__btn--maximize\s*{[^}]*display:\s*none\s*!important/,
        "maximize button hidden on mobile since windows are already full screen",
      );
    });
  });

  describe("4. WindowLayer & AppDefinition lookup", () => {
    it("renders all open windows using WindowLayer and AppDefinition lookup", () => {
      const initialWindows: WindowState[] = [
        {
          id: "win-about",
          appId: "about",
          x: 40,
          y: 40,
          w: 560,
          h: 420,
          z: 1,
          minimized: false,
          maximized: false,
        },
        {
          id: "win-terminal",
          appId: "terminal",
          x: 68,
          y: 68,
          w: 640,
          h: 400,
          z: 2,
          minimized: false,
          maximized: false,
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(
          WindowManagerProvider,
          { apps: sampleAppsFixture, initialWindows },
          React.createElement(WindowLayer, { apps: sampleAppsFixture }),
        ),
      );

      assert.ok(html.includes('data-testid="yk-window-layer"'), "has window layer");
      assert.ok(html.includes('data-testid="window-about"'), "renders about window");
      assert.ok(html.includes('data-testid="window-terminal"'), "renders terminal window");
      assert.ok(html.includes("About"), "renders About title from AppDefinition");
      assert.ok(html.includes("Terminal"), "renders Terminal title from AppDefinition");
      assert.ok(html.includes("📄"), "renders About icon from AppDefinition");
      assert.ok(html.includes("💻"), "renders Terminal icon from AppDefinition");
    });

    it("hides minimized window with hidden and yk-window--minimized", () => {
      const initialWindows: WindowState[] = [
        {
          id: "win-writing",
          appId: "writing",
          x: 40,
          y: 40,
          w: 600,
          h: 400,
          z: 1,
          minimized: true,
          maximized: false,
        },
      ];

      const html = renderToStaticMarkup(
        React.createElement(
          WindowManagerProvider,
          { apps: sampleAppsFixture, initialWindows },
          React.createElement(WindowLayer, { apps: sampleAppsFixture }),
        ),
      );

      assert.ok(
        html.includes("yk-window--minimized"),
        "minimized window has yk-window--minimized class",
      );
      assert.ok(
        html.includes("hidden"),
        "minimized window has hidden attribute for accessibility",
      );
      assert.ok(
        html.includes('aria-hidden="true"'),
        "minimized window has aria-hidden=true",
      );
    });
  });

  describe("5. Contract Hook Exports", () => {
    it("exports useOS and useWindowManager as callable functions", () => {
      assert.equal(typeof useOS, "function", "useOS is a function");
      assert.equal(typeof useWindowManager, "function", "useWindowManager is a function");

      const results: {
        os: ReturnType<typeof useOS> | null;
        wm: ReturnType<typeof useWindowManager> | null;
      } = { os: null, wm: null };

      const FallbackConsumer = () => {
        results.os = useOS();
        results.wm = useWindowManager();
        return React.createElement("div", null, "test");
      };

      renderToStaticMarkup(React.createElement(FallbackConsumer));

      assert.ok(results.os);
      assert.ok(results.wm);
      if (!results.os || !results.wm) {
        throw new Error("Hooks failed to execute inside component");
      }

      assert.deepEqual(results.os.windows, []);
      assert.equal(typeof results.os.open, "function");
      assert.equal(typeof results.os.close, "function");
      assert.equal(typeof results.os.focus, "function");

      assert.deepEqual(results.wm.windows, []);
      assert.equal(typeof results.wm.minimize, "function");
      assert.equal(typeof results.wm.maximize, "function");
      assert.equal(typeof results.wm.restore, "function");
      assert.equal(typeof results.wm.move, "function");
      assert.equal(typeof results.wm.resize, "function");
      assert.equal(results.wm.focusedWindowId, null);
    });

    it("provides active OS state when wrapped in WindowManagerProvider", () => {
      const results: { os: ReturnType<typeof useOS> | null } = { os: null };

      const ActiveConsumer = () => {
        results.os = useOS();
        return React.createElement("div", null, "active");
      };

      const initialWindows: WindowState[] = [
        {
          id: "win-about",
          appId: "about",
          x: 40,
          y: 40,
          w: 560,
          h: 420,
          z: 1,
          minimized: false,
          maximized: false,
        },
      ];

      renderToStaticMarkup(
        React.createElement(
          WindowManagerProvider,
          { initialWindows },
          React.createElement(ActiveConsumer),
        ),
      );

      assert.ok(results.os);
      if (!results.os) {
        throw new Error("Active OS hook failed to execute inside provider");
      }
      assert.equal(results.os.windows.length, 1);
      assert.equal(results.os.windows[0].id, "win-about");
    });
  });

  describe("6. Verified Content Integrity (PRD §4)", () => {
    it("only uses verified AppIds and titles from PRD §4 / §13.1", () => {
      const verifiedAppIds = [
        "about",
        "experience",
        "projects",
        "writing",
        "contact",
        "terminal",
      ];

      for (const app of sampleAppsFixture) {
        assert.ok(
          verifiedAppIds.includes(app.id),
          `App ${app.id} is one of verified AppIds`,
        );
      }
    });
  });
});
