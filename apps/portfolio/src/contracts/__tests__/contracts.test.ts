import { describe, it, expect } from "vitest";
import type {
  ISODateMonth,
  Link,
  Role,
  Project,
  Article,
  Education,
  Profile,
} from "../content";
import type { AppId, AppDefinition, AppProps } from "../apps";
import type {
  WindowState,
  OSApi,
  Theme,
  PrefsApi,
  Route,
} from "../os";
import type {
  TerminalContext,
  TerminalCommand,
} from "../terminal";

describe("Contracts PRD §13.1", () => {
  it("validates content contract types and structure", () => {
    const role: Role = {
      company: "FULL Creative",
      companyUrl: "https://full.io/",
      title: "Senior Software Engineer",
      start: "2024-07" as ISODateMonth,
      end: null,
      location: "Chennai, Tamil Nadu, India",
      bullets: [],
    };

    const link: Link = {
      label: "GitHub",
      href: "https://github.com",
    };

    const project: Project = {
      name: "vitest-portfolio",
      description: "stress test runs",
      href: "https://github.com/yogeshkumarasamy/vitest-portfolio",
      language: "TypeScript",
    };

    const article: Article = {
      title: "How SSH Makes Managing Multiple Git Accounts Easy and Secure",
      publication: "FULL Creative blog on Medium",
      date: "2025-04-17",
      href: "https://medium.com",
    };

    const education: Education = {
      institution: "RVS College of Engineering and Technology",
      credential: "B.Tech., Information Technology",
      start: 2008,
      end: 2012,
    };

    const profile: Profile = {
      name: "Yogesh Kumarasamy",
      aliases: ["yogesh kumar"],
      headline: "Senior Software Engineer",
      location: "Chennai, Tamil Nadu, India",
      email: "yogeshkumarasamy@gmail.com",
      about: null,
      photo: null,
      phone: null,
      links: {
        linkedin: "https://linkedin.com",
        github: "https://github.com",
        medium: "https://medium.com",
      },
      skills: ["Vitest", "CI/CD"],
      experience: [role],
      projects: [project],
      writing: [article],
      education: [education],
      certifications: [],
    };

    expect(profile.name).toBe("Yogesh Kumarasamy");
    expect(link.label).toBe("GitHub");
  });

  it("validates apps contract types", () => {
    const validAppIds: AppId[] = [
      "about",
      "experience",
      "projects",
      "writing",
      "contact",
      "terminal",
    ];

    expect(validAppIds).toHaveLength(6);

    const props: AppProps = { windowId: "test-window-1" };
    expect(props.windowId).toBe("test-window-1");

    const appDef: Partial<AppDefinition> = {
      id: "terminal",
      title: "Terminal",
      icon: ">_",
      order: 1,
      defaultSize: { w: 640, h: 480 },
    };
    expect(appDef.id).toBe("terminal");
  });

  it("validates os contract types and values", () => {
    const windowState: WindowState = {
      id: "win-1",
      appId: "about",
      x: 10,
      y: 20,
      w: 600,
      h: 400,
      z: 1,
      minimized: false,
      maximized: false,
    };

    const desktopRoute: Route = { view: "desktop" };
    const classicRoute: Route = { view: "classic" };
    const appRoute: Route = { view: "app", appId: "terminal" };

    const themes: Theme[] = ["green", "amber", "light"];

    const osApi: OSApi = {
      open: () => {},
      close: () => {},
      focus: () => {},
      windows: [windowState],
    };

    const prefsApi: PrefsApi = {
      theme: "green",
      setTheme: () => {},
      crt: true,
      setCrt: () => {},
      reducedMotion: false,
    };

    expect(windowState.appId).toBe("about");
    expect(desktopRoute.view).toBe("desktop");
    expect(classicRoute.view).toBe("classic");
    expect(appRoute.view).toBe("app");
    expect(themes).toContain("green");
    expect(osApi.windows).toHaveLength(1);
    expect(prefsApi.crt).toBe(true);
  });

  it("validates terminal contract types", () => {
    const profile: Profile = {
      name: "Yogesh Kumarasamy",
      aliases: [],
      headline: "Senior Software Engineer",
      location: "Chennai",
      email: "test@example.com",
      about: null,
      photo: null,
      phone: null,
      links: { linkedin: "", github: "", medium: "" },
      skills: [],
      experience: [],
      projects: [],
      writing: [],
      education: [],
      certifications: [],
    };

    const ctx: TerminalContext = {
      profile,
      os: { open: () => {}, close: () => {}, focus: () => {}, windows: [] },
      prefs: {
        theme: "green",
        setTheme: () => {},
        crt: true,
        setCrt: () => {},
        reducedMotion: false,
      },
      navigate: () => {},
    };

    const cmd: TerminalCommand = {
      name: "help",
      summary: "Show available commands",
      run: (args, context) =>
        `Executed ${args.join(" ")} for ${context.profile.name}`,
    };

    expect(cmd.name).toBe("help");
    expect(cmd.summary).toBe("Show available commands");
    expect(cmd.run(["arg1"], ctx)).toContain("Executed arg1 for Yogesh Kumarasamy");
  });
});
