import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { register } from "node:module";
import { pathToFileURL } from "node:url";
import type { TerminalContext, Profile, AppId, Theme } from "../types";

// Register custom loader for .css and extensionless / tsx resolution in raw Node
try {
  const cwd = typeof process !== "undefined" && process.cwd ? process.cwd() : "";
  const viteUrl = pathToFileURL(`${cwd}/node_modules/vite/dist/node/index.js`).href;

  register(
    "data:text/javascript," +
      encodeURIComponent(`
    import { existsSync, readFileSync } from 'node:fs';
    import { fileURLToPath } from 'node:url';

    let transformFn;

    export async function resolve(specifier, context, nextResolve) {
      if (specifier.endsWith('.css')) {
        return { url: 'data:text/javascript,export default {}', shortCircuit: true };
      }
      try {
        return await nextResolve(specifier, context);
      } catch (err) {
        if (context.parentURL && context.parentURL.startsWith('file:') && (specifier.startsWith('./') || specifier.startsWith('../'))) {
          const parentDir = new URL('.', context.parentURL);
          for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
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
      if (url.endsWith('.css')) {
        return { format: 'module', shortCircuit: true, source: 'export default {};' };
      }
      if (url.endsWith('.tsx')) {
        try {
          if (!transformFn) {
            const vite = await import('${viteUrl}');
            transformFn = vite.transformWithEsbuild;
          }
          const raw = readFileSync(fileURLToPath(url), 'utf8');
          const transformed = await transformFn(raw, fileURLToPath(url), { jsx: 'automatic' });
          return { format: 'module', shortCircuit: true, source: transformed.code };
        } catch {
          // If transform fails or vite is unavailable, fallback
        }
      }
      return nextLoad(url, context);
    }
  `),
    import.meta.url,
  );
} catch {
  // Ignored in environments where register is unavailable or unnecessary
}

const React = (await import("react")).default;
const { renderToStaticMarkup } = await import("react-dom/server");
const {
  terminalAppDefinition,
  commands,
  executeCommand,
  getTabCompletions,
  TerminalApp,
  CHIP_COMMANDS,
  PROMPT_STRING,
} = await import("../index");
const { verifiedProfile } = await import("../__fixtures__/profile");

function createMockContext(overrides?: Partial<TerminalContext>): {
  ctx: TerminalContext;
  openedApps: AppId[];
  navigatedTo: string[];
  themesSet: Theme[];
} {
  const openedApps: AppId[] = [];
  const navigatedTo: string[] = [];
  const themesSet: Theme[] = [];

  const ctx: TerminalContext = {
    profile: verifiedProfile,
    os: {
      open: (appId: AppId) => {
        openedApps.push(appId);
      },
      close: () => {},
      focus: () => {},
      windows: [],
    },
    prefs: {
      theme: "green",
      setTheme: (t: Theme) => {
        themesSet.push(t);
      },
      crt: true,
      setCrt: () => {},
      reducedMotion: false,
    },
    navigate: (to) => {
      navigatedTo.push(to);
    },
    history: [],
    ...overrides,
  };

  return { ctx, openedApps, navigatedTo, themesSet };
}

describe("Terminal App (workspace#32 / PRD §6 & §13)", () => {
  describe("AppDefinition contract", () => {
    it("exports default AppDefinition conforming to PRD §13.1", () => {
      assert.equal(terminalAppDefinition.id, "terminal");
      assert.equal(terminalAppDefinition.title, "Terminal");
      assert.equal(terminalAppDefinition.icon, "📟");
      assert.equal(terminalAppDefinition.order, 6);
      assert.equal(terminalAppDefinition.defaultSize.w, 640);
      assert.equal(terminalAppDefinition.defaultSize.h, 420);
      assert.ok(terminalAppDefinition.component, "Component must be defined");
    });

    it("registers all required acceptance criteria commands in commands export", () => {
      const required = [
        "help",
        "whoami",
        "about",
        "experience",
        "projects",
        "writing",
        "contact",
        "skills",
        "open",
        "classic",
        "theme",
        "clear",
        "history",
        "date",
        "echo",
        "sudo hire-me",
      ];

      const commandNames = commands.map((c: { name: string }) => c.name);

      for (const req of required) {
        assert.ok(
          commandNames.includes(req) || commandNames.includes(req.split(" ")[0]),
          `Expected command list to include '${req}'`,
        );
      }

      // Check all commands have non-empty summary and run function
      for (const cmd of commands) {
        assert.ok(cmd.name.length > 0);
        assert.ok(cmd.summary.length > 0);
        assert.equal(typeof cmd.run, "function");
      }
    });
  });

  describe("Unit tests per command (with verified fixture profile)", () => {
    it("help: displays available commands and helpful usage tips", () => {
      const { ctx } = createMockContext();
      const helpCmd = commands.find((c: { name: string }) => c.name === "help")!;
      const result = helpCmd.run([], ctx);
      const text = Array.isArray(result) ? result.join("\n") : result;

      assert.match(text, /YK-OS Terminal/);
      assert.match(text, /help/);
      assert.match(text, /whoami/);
      assert.match(text, /experience/);
      assert.match(text, /projects/);
      assert.match(text, /sudo hire-me/);
    });

    it("whoami: outputs verified name, headline, and location", () => {
      const { ctx } = createMockContext();
      const whoamiCmd = commands.find((c: { name: string }) => c.name === "whoami")!;
      const result = whoamiCmd.run([], ctx);
      const text = Array.isArray(result) ? result.join("\n") : result;

      assert.match(text, /Yogesh Kumarasamy/);
      assert.match(text, /Senior Software Engineer at FULL Creative/);
      assert.match(text, /Chennai, Tamil Nadu, India/);
    });

    it("about: outputs headline, education, and bio placeholder without inventing facts", () => {
      const { ctx } = createMockContext();
      const aboutCmd = commands.find((c: { name: string }) => c.name === "about")!;
      const result = aboutCmd.run([], ctx);
      const text = Array.isArray(result) ? result.join("\n") : result;

      assert.match(text, /Yogesh Kumarasamy/);
      assert.match(text, /Senior Software Engineer at FULL Creative/);
      assert.match(text, /RVS College of Engineering and Technology/);
      assert.match(text, /Pending Owner copy/);
    });

    it("about: outputs custom bio if profile provides one", () => {
      const customProfile: Profile = {
        ...verifiedProfile,
        about: "Custom verified biography content.",
      };
      const { ctx } = createMockContext({ profile: customProfile });
      const aboutCmd = commands.find((c: { name: string }) => c.name === "about")!;
      const result = aboutCmd.run([], ctx);
      const text = Array.isArray(result) ? result.join("\n") : result;

      assert.match(text, /Custom verified biography content\./);
    });

    it("experience: outputs all 9 verified roles in order with companies and dates", () => {
      const { ctx } = createMockContext();
      const expCmd = commands.find((c: { name: string }) => c.name === "experience")!;
      const result = expCmd.run([], ctx);
      const text = Array.isArray(result) ? result.join("\n") : result;

      assert.match(text, /FULL Creative/);
      assert.match(text, /Trimble Inc\./);
      assert.match(text, /BI WORLDWIDE/);
      assert.match(text, /Accenture/);
      assert.match(text, /Pearson English Business Solutions/);
      assert.match(text, /ISGN/);
      assert.match(text, /The Design Factory/);
      assert.match(text, /2024-07/);
      assert.match(text, /2012-10/);
    });

    it("projects: outputs vitest-portfolio and excludes private workspace repo", () => {
      const { ctx } = createMockContext();
      const projCmd = commands.find((c: { name: string }) => c.name === "projects")!;
      const result = projCmd.run([], ctx);
      const text = Array.isArray(result) ? result.join("\n") : result;

      assert.match(text, /vitest-portfolio/);
      assert.match(text, /TypeScript/);
      assert.match(text, /https:\/\/github\.com\/yogeshkumarasamy\/vitest-portfolio/);
      assert.doesNotMatch(text, /private/);
      assert.doesNotMatch(text, /workspace#/);
    });

    it("writing: outputs verified Medium SSH article", () => {
      const { ctx } = createMockContext();
      const writingCmd = commands.find((c: { name: string }) => c.name === "writing")!;
      const result = writingCmd.run([], ctx);
      const text = Array.isArray(result) ? result.join("\n") : result;

      assert.match(text, /How SSH Makes Managing Multiple Git Accounts Easy and Secure/);
      assert.match(text, /FULL Creative blog on Medium/);
      assert.match(text, /2025-04-17/);
    });

    it("contact: outputs email and social links from profile", () => {
      const { ctx } = createMockContext();
      const contactCmd = commands.find((c: { name: string }) => c.name === "contact")!;
      const result = contactCmd.run([], ctx);
      const text = Array.isArray(result) ? result.join("\n") : result;

      assert.match(text, /yogeshkumarasamy@gmail\.com/);
      assert.match(text, /linkedin\.com\/in\/yogeshkumarasamy/);
      assert.match(text, /github\.com\/yogeshkumarasamy/);
      assert.match(text, /medium\.com\/@yogeshkumarasamy/);
    });

    it("skills: outputs verified core skills from profile", () => {
      const { ctx } = createMockContext();
      const skillsCmd = commands.find((c: { name: string }) => c.name === "skills")!;
      const result = skillsCmd.run([], ctx);
      const text = Array.isArray(result) ? result.join("\n") : result;

      assert.match(text, /Continuous Integration and Continuous Delivery \(CI\/CD\)/);
      assert.match(text, /CSS-in-JS/);
      assert.match(text, /Vitest/);
    });

    it("open: opens application window or shows usage/error", () => {
      const { ctx, openedApps } = createMockContext();
      const openCmd = commands.find((c: { name: string }) => c.name === "open")!;

      // No args
      const noArgsRes = openCmd.run([], ctx);
      assert.match(String(noArgsRes), /Usage: open <app>/);

      // Unknown app
      const unknownRes = openCmd.run(["calculator"], ctx);
      assert.match(String(unknownRes), /Unknown app: 'calculator'/);
      assert.equal(openedApps.length, 0);

      // Valid app: about
      const aboutRes = openCmd.run(["about"], ctx);
      assert.match(String(aboutRes), /Opening about\.\.\./);
      assert.equal(openedApps[0], "about");

      // Valid app: experience
      openCmd.run(["experience"], ctx);
      assert.equal(openedApps[1], "experience");
    });

    it("classic: triggers navigation to Classic view", () => {
      const { ctx, navigatedTo } = createMockContext();
      const classicCmd = commands.find((c: { name: string }) => c.name === "classic")!;
      const res = classicCmd.run([], ctx);

      assert.match(String(res), /Navigating to Classic view/);
      assert.equal(navigatedTo[0], "classic");
    });

    it("theme: views or updates UI theme", () => {
      const { ctx, themesSet } = createMockContext();
      const themeCmd = commands.find((c: { name: string }) => c.name === "theme")!;

      // No args -> shows current theme
      const currentRes = themeCmd.run([], ctx);
      assert.match(String(currentRes), /Current theme: 'green'/);

      // Invalid theme
      const invalidRes = themeCmd.run(["cyberpunk"], ctx);
      assert.match(String(invalidRes), /Invalid theme: 'cyberpunk'/);
      assert.equal(themesSet.length, 0);

      // Valid theme: amber
      const amberRes = themeCmd.run(["amber"], ctx);
      assert.match(String(amberRes), /Theme changed to 'amber'/);
      assert.equal(themesSet[0], "amber");

      // Valid theme: light
      themeCmd.run(["light"], ctx);
      assert.equal(themesSet[1], "light");
    });

    it("clear: returns empty string to signal screen clearing", () => {
      const { ctx } = createMockContext();
      const clearCmd = commands.find((c: { name: string }) => c.name === "clear")!;
      const res = clearCmd.run([], ctx);
      assert.equal(res, "");
    });

    it("history: displays formatted execution history", () => {
      const { ctx: emptyCtx } = createMockContext({ history: [] });
      const historyCmd = commands.find((c: { name: string }) => c.name === "history")!;
      const emptyRes = historyCmd.run([], emptyCtx);
      assert.match(String(emptyRes), /No commands in history/);

      const { ctx: filledCtx } = createMockContext({
        history: ["whoami", "skills", "projects"],
      });
      const filledRes = historyCmd.run([], filledCtx);
      const text = Array.isArray(filledRes) ? filledRes.join("\n") : filledRes;

      assert.match(text, /1\s+whoami/);
      assert.match(text, /2\s+skills/);
      assert.match(text, /3\s+projects/);
    });

    it("date: outputs valid timestamp string", () => {
      const { ctx } = createMockContext();
      const dateCmd = commands.find((c: { name: string }) => c.name === "date")!;
      const res = dateCmd.run([], ctx);
      assert.ok(String(res).length > 5);
    });

    it("echo: echoes back arguments", () => {
      const { ctx } = createMockContext();
      const echoCmd = commands.find((c: { name: string }) => c.name === "echo")!;
      const res = echoCmd.run(["hello", "world", "2026"], ctx);
      assert.equal(res, "hello world 2026");
    });

    it("sudo: without 'hire-me' returns permission denied", () => {
      const { ctx, openedApps } = createMockContext();
      const sudoCmd = commands.find((c: { name: string }) => c.name === "sudo")!;
      const res = sudoCmd.run(["rm", "-rf", "/"], ctx);

      assert.match(String(res), /Permission denied/);
      assert.match(String(res), /Try 'sudo hire-me'/);
      assert.equal(openedApps.length, 0);
    });

    it("sudo hire-me: triggers hiring easter egg and opens contact app", () => {
      const { ctx, openedApps } = createMockContext();
      const sudoCmd = commands.find((c: { name: string }) => c.name === "sudo")!;
      const res = sudoCmd.run(["hire-me"], ctx);
      const text = Array.isArray(res) ? res.join("\n") : res;

      assert.match(text, /ELEVATED ACCESS GRANTED/);
      assert.match(text, /Candidate unlocked: Yogesh Kumarasamy/);
      assert.match(text, /yogeshkumarasamy@gmail\.com/);
      assert.equal(openedApps[0], "contact");
    });

    it("sudo hire-me: works via dedicated command definition", () => {
      const { ctx, openedApps } = createMockContext();
      const sudoHireMeCmd = commands.find((c: { name: string }) => c.name === "sudo hire-me")!;
      assert.ok(sudoHireMeCmd);

      const res = sudoHireMeCmd.run([], ctx);
      const text = Array.isArray(res) ? res.join("\n") : res;

      assert.match(text, /ELEVATED ACCESS GRANTED/);
      assert.equal(openedApps[0], "contact");
    });
  });

  describe("executeCommand & Unknown command behavior", () => {
    it("returns formatted unknown command error matching PRD §6", () => {
      const { ctx } = createMockContext();
      const res = executeCommand("nonexistentcmd", ctx);

      assert.equal(res.output.length, 1);
      assert.equal(res.output[0], "command not found: nonexistentcmd. Try 'help'");
    });

    it("handles clear command by returning clear: true flag", () => {
      const { ctx } = createMockContext();
      const res = executeCommand("clear", ctx);
      assert.equal(res.clear, true);
    });

    it("handles whitespace and empty lines gracefully", () => {
      const { ctx } = createMockContext();
      const res = executeCommand("   ", ctx);
      assert.equal(res.output.length, 0);
    });

    it("executes multi-word command 'sudo hire-me' through engine", () => {
      const { ctx, openedApps } = createMockContext();
      const res = executeCommand("sudo hire-me", ctx);
      const text = res.output.join("\n");

      assert.match(text, /ELEVATED ACCESS GRANTED/);
      assert.equal(openedApps[0], "contact");
    });
  });

  describe("Tab completion logic", () => {
    it("completes unique command names with trailing space", () => {
      const compWho = getTabCompletions("who", commands);
      assert.equal(compWho.match, "whoami ");

      const compSkills = getTabCompletions("sk", commands);
      assert.equal(compSkills.match, "skills ");

      const compExp = getTabCompletions("exp", commands);
      assert.equal(compExp.match, "experience ");
    });

    it("returns candidates when multiple commands match prefix", () => {
      // e.g. commands starting with 's' -> skills, sudo, sudo hire-me
      const compS = getTabCompletions("s", commands);
      assert.ok(compS.matches && compS.matches.length >= 2);
    });

    it("completes arguments for 'open' command", () => {
      const compOpenAb = getTabCompletions("open ab", commands);
      assert.equal(compOpenAb.match, "open about");

      const compOpenExp = getTabCompletions("open exp", commands);
      assert.equal(compOpenExp.match, "open experience");
    });

    it("completes arguments for 'theme' command", () => {
      const compThemeAm = getTabCompletions("theme am", commands);
      assert.equal(compThemeAm.match, "theme amber");
    });

    it("completes 'sudo hire-me'", () => {
      const compSudo = getTabCompletions("sudo hi", commands);
      assert.equal(compSudo.match, "sudo hire-me");
    });
  });

  describe("Accessibility & DOM Structure", () => {
    it("renders output container with role=log and aria-live=polite", () => {
      const html = renderToStaticMarkup(
        React.createElement(TerminalApp, { windowId: "test-window" }),
      );

      assert.match(html, /role="log"/);
      assert.match(html, /aria-live="polite"/);
      assert.match(html, /aria-atomic="false"/);
    });

    it("renders labelled input with aria-label", () => {
      const html = renderToStaticMarkup(
        React.createElement(TerminalApp, { windowId: "test-window" }),
      );

      assert.match(html, /aria-label="Terminal command input"/);
      assert.match(html, /<label[^>]*>Terminal command input<\/label>/);
      assert.match(html, /id="yk-terminal-cmd-input"/);
    });

    it("renders verified prompt string yogesh@yk-os:~$", () => {
      const html = renderToStaticMarkup(
        React.createElement(TerminalApp, { windowId: "test-window" }),
      );

      assert.match(html, new RegExp(PROMPT_STRING.replace("$", "\\$")));
    });

    it("renders mobile command chips in toolbar", () => {
      const html = renderToStaticMarkup(
        React.createElement(TerminalApp, { windowId: "test-window" }),
      );

      assert.match(html, /role="toolbar"/);
      assert.match(html, /aria-label="Quick command chips"/);

      for (const chip of CHIP_COMMANDS) {
        assert.match(html, new RegExp(`>${chip}<`));
      }
    });
  });
});
