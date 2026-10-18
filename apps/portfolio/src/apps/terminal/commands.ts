import type { AppId, TerminalCommand, TerminalContext, Theme } from "./types";

export const helpCommand: TerminalCommand = {
  name: "help",
  summary: "List all available terminal commands",
  run() {
    const lines = [
      "YK-OS Terminal v2026. Type any command below to explore:",
      "",
    ];
    for (const cmd of commands) {
      lines.push(`  ${cmd.name.padEnd(16, " ")} - ${cmd.summary}`);
    }
    lines.push("");
    lines.push("Tip: Use Tab for auto-completion, ↑/↓ for command history.");
    return lines;
  },
};

export const whoamiCommand: TerminalCommand = {
  name: "whoami",
  summary: "Display current user identity and headline",
  run(_args, ctx) {
    return [
      `User:     ${ctx.profile.name} (alias: ${ctx.profile.aliases.join(", ")})`,
      `Headline: ${ctx.profile.headline}`,
      `Location: ${ctx.profile.location}`,
    ];
  },
};

export const aboutCommand: TerminalCommand = {
  name: "about",
  summary: "Display developer biography and background",
  run(_args, ctx) {
    const lines: string[] = [
      `=== ${ctx.profile.name} ===`,
      `${ctx.profile.headline}`,
      `Location: ${ctx.profile.location}`,
    ];

    if (ctx.profile.about) {
      lines.push("", ctx.profile.about);
    } else {
      lines.push(
        "",
        "Bio: [Pending Owner copy — placeholder in dev, hidden in prod]",
      );
    }

    if (ctx.profile.education.length > 0) {
      lines.push("", "Education:");
      for (const edu of ctx.profile.education) {
        lines.push(
          `  ${edu.credential ? edu.credential + ", " : ""}${edu.institution} (${edu.start}–${edu.end})`,
        );
      }
    }

    return lines;
  },
};

export const experienceCommand: TerminalCommand = {
  name: "experience",
  summary: "List professional experience and career history",
  run(_args, ctx) {
    const lines: string[] = ["Professional Experience (Reverse-chronological):", ""];

    ctx.profile.experience.forEach((role, idx) => {
      const endLabel = role.end ?? "present";
      lines.push(
        `[${idx + 1}] ${role.title} @ ${role.company}${role.companyUrl ? ` (${role.companyUrl})` : ""}`,
      );
      lines.push(`    Dates:    ${role.start} – ${endLabel}`);
      if (role.location) {
        lines.push(`    Location: ${role.location}`);
      }
      if (role.bullets && role.bullets.length > 0) {
        for (const bullet of role.bullets) {
          lines.push(`    • ${bullet}`);
        }
      }
      lines.push("");
    });

    return lines;
  },
};

export const projectsCommand: TerminalCommand = {
  name: "projects",
  summary: "List company projects",
  run(_args, ctx) {
    const lines: string[] = ["Projects:", ""];
    const grouped = ctx.profile.projects.some((project) => project.company);
    if (!grouped) {
      for (const project of ctx.profile.projects) {
        lines.push(
          `• ${project.name}${project.language ? ` [${project.language}]` : ""}`,
        );
        if (project.description) {
          lines.push(`  Description: ${project.description}`);
        }
        if (project.href) {
          lines.push(`  URL:         ${project.href}`);
        }
        lines.push("");
      }
      return lines;
    }

    const seen: string[] = [];
    for (const project of ctx.profile.projects) {
      const company = project.company ?? "";
      if (!seen.includes(company)) seen.push(company);
    }
    for (const company of seen) {
      if (company) lines.push(company);
      for (const project of ctx.profile.projects) {
        if ((project.company ?? "") !== company) continue;
        lines.push(`  • ${project.name}`);
        if (project.href) lines.push(`    URL: ${project.href}`);
      }
      lines.push("");
    }
    return lines;
  },
};

export const writingCommand: TerminalCommand = {
  name: "writing",
  summary: "List published technical articles and publications",
  run(_args, ctx) {
    const lines: string[] = ["Published Technical Articles:", ""];
    for (const article of ctx.profile.writing) {
      lines.push(`• ${article.title}`);
      lines.push(`  Publication: ${article.publication} (${article.date})`);
      lines.push(`  URL:         ${article.href}`);
      lines.push("");
    }
    return lines;
  },
};

export const contactCommand: TerminalCommand = {
  name: "contact",
  summary: "Display direct contact info and social links",
  run(_args, ctx) {
    return [
      "Contact Details & Public Profiles:",
      `  Email:    ${ctx.profile.email}`,
      `  LinkedIn: ${ctx.profile.links.linkedin}`,
      `  GitHub:   ${ctx.profile.links.github}`,
      `  Medium:   ${ctx.profile.links.medium}`,
    ];
  },
};

export const skillsCommand: TerminalCommand = {
  name: "skills",
  summary: "Display verified core technical skills",
  run(_args, ctx) {
    const lines = [
      "Verified Technical Skills:",
      ...ctx.profile.skills.map((s) => `  • ${s}`),
    ];
    for (const group of ctx.profile.skillGroups ?? []) {
      lines.push("", `${group.label}:`);
      for (const skill of group.skills) {
        lines.push(`  • ${skill}`);
      }
    }
    return lines;
  },
};

const VALID_APPS: AppId[] = [
  "about",
  "experience",
  "projects",
  "writing",
  "contact",
  "terminal",
];

export const openCommand: TerminalCommand = {
  name: "open",
  summary: "Open an application window (e.g. open about)",
  run(args, ctx) {
    if (args.length === 0) {
      return `Usage: open <app>. Available apps: ${VALID_APPS.join(", ")}`;
    }
    const target = args[0].toLowerCase() as AppId;
    if (VALID_APPS.includes(target)) {
      try {
        ctx.os.open(target);
      } catch {
        // Fallback if OS api throws
      }
      return `Opening ${target}...`;
    }
    return `Unknown app: '${args[0]}'. Available apps: ${VALID_APPS.join(", ")}`;
  },
};

export const classicCommand: TerminalCommand = {
  name: "classic",
  summary: "Switch to the accessible single-page Classic view",
  run(_args, ctx) {
    try {
      ctx.navigate("classic");
    } catch {
      // Fallback
    }
    return "Navigating to Classic view...";
  },
};

const VALID_THEMES: Theme[] = ["green", "amber", "light"];

export const themeCommand: TerminalCommand = {
  name: "theme",
  summary: "Switch display theme (green | amber | light)",
  run(args, ctx) {
    if (args.length === 0) {
      return `Current theme: '${ctx.prefs.theme}'. Available themes: ${VALID_THEMES.join(", ")}`;
    }
    const requested = args[0].toLowerCase() as Theme;
    if (VALID_THEMES.includes(requested)) {
      try {
        ctx.prefs.setTheme(requested);
      } catch {
        // Fallback
      }
      return `Theme changed to '${requested}'.`;
    }
    return `Invalid theme: '${args[0]}'. Choose from: ${VALID_THEMES.join(", ")}`;
  },
};

export const clearCommand: TerminalCommand = {
  name: "clear",
  summary: "Clear the terminal screen",
  run() {
    return "";
  },
};

export const historyCommand: TerminalCommand = {
  name: "history",
  summary: "Display command history for this session",
  run(_args, ctx) {
    const list = ctx.history ?? [];
    if (list.length === 0) {
      return "No commands in history.";
    }
    return list.map((cmd, i) => `  ${(i + 1).toString().padStart(3, " ")}  ${cmd}`);
  },
};

export const dateCommand: TerminalCommand = {
  name: "date",
  summary: "Display current system date and time",
  run() {
    return new Date().toString();
  },
};

export const echoCommand: TerminalCommand = {
  name: "echo",
  summary: "Print text to terminal output",
  run(args) {
    return args.join(" ");
  },
};

export const sudoCommand: TerminalCommand = {
  name: "sudo",
  summary: "Execute command as superuser (try: sudo hire-me)",
  run(args, ctx) {
    const target = args.join(" ").trim().toLowerCase();
    if (target === "hire-me") {
      try {
        ctx.os.open("contact");
      } catch {
        // Handled
      }
      return [
        "*** ELEVATED ACCESS GRANTED ***",
        `Candidate unlocked: ${ctx.profile.name}`,
        `Headline:           ${ctx.profile.headline}`,
        `Email:              ${ctx.profile.email}`,
        `LinkedIn:           ${ctx.profile.links.linkedin}`,
        "Contact window opened. Looking forward to speaking with you!",
      ];
    }
    return "Permission denied: you are not in the sudoers file. This incident will be reported. Try 'sudo hire-me'.";
  },
};

export const sudoHireMeCommand: TerminalCommand = {
  name: "sudo hire-me",
  summary: "Easter egg: recruit Yogesh / launch contact window",
  run(args, ctx) {
    return sudoCommand.run(["hire-me", ...args], ctx);
  },
};

/**
 * All commands registered in the terminal in standard order.
 */
export const commands: TerminalCommand[] = [
  helpCommand,
  whoamiCommand,
  aboutCommand,
  experienceCommand,
  projectsCommand,
  writingCommand,
  contactCommand,
  skillsCommand,
  openCommand,
  classicCommand,
  themeCommand,
  clearCommand,
  historyCommand,
  dateCommand,
  echoCommand,
  sudoCommand,
  sudoHireMeCommand,
];

/**
 * Execute a raw input line against the terminal context.
 */
export function executeCommand(
  rawInput: string,
  ctx: TerminalContext,
  historyList: string[] = [],
): { output: string[]; clear?: boolean } {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { output: [] };
  }

  // Handle 'clear' command directly
  if (trimmed.toLowerCase() === "clear") {
    return { output: [], clear: true };
  }

  // Tokenize line (splitting by whitespace)
  const tokens = trimmed.split(/\s+/);
  const firstWord = tokens[0].toLowerCase();

  // Check for multi-word command like "sudo hire-me"
  if (tokens.length >= 2) {
    const twoWordName = `${firstWord} ${tokens[1].toLowerCase()}`;
    const multiMatch = commands.find((c) => c.name.toLowerCase() === twoWordName);
    if (multiMatch) {
      const rest = tokens.slice(2);
      const res = multiMatch.run(rest, { ...ctx, history: historyList });
      return { output: Array.isArray(res) ? res : [res] };
    }
  }

  // Check for single-word command
  const match = commands.find((c) => c.name.toLowerCase() === firstWord);
  if (match) {
    const args = tokens.slice(1);
    const res = match.run(args, { ...ctx, history: historyList });
    return { output: Array.isArray(res) ? res : [res] };
  }

  return {
    output: [`command not found: ${firstWord}. Try 'help'`],
  };
}

/**
 * Calculate tab completions given current input string.
 */
export function getTabCompletions(
  input: string,
  commandList: TerminalCommand[] = commands,
): { match?: string; matches?: string[] } {
  const trimmedLeading = input.trimStart();
  const tokens = trimmedLeading.split(/\s+/);

  // If typing first token
  if (tokens.length <= 1 && !input.endsWith(" ")) {
    const prefix = (tokens[0] || "").toLowerCase();
    const candidates = commandList
      .map((c) => c.name)
      .filter((n) => n.startsWith(prefix));

    if (candidates.length === 1) {
      return { match: candidates[0] + " " };
    }
    if (candidates.length > 1) {
      return { matches: candidates };
    }
    return {};
  }

  const cmd = tokens[0].toLowerCase();
  const lastToken = (input.endsWith(" ") ? "" : tokens[tokens.length - 1]).toLowerCase();

  // Argument completions for 'open'
  if (cmd === "open") {
    const apps = VALID_APPS.filter((a) => a.startsWith(lastToken));
    if (apps.length === 1) {
      return { match: `open ${apps[0]}` };
    }
    if (apps.length > 1) {
      return { matches: apps };
    }
  }

  // Argument completions for 'theme'
  if (cmd === "theme") {
    const themes = VALID_THEMES.filter((t) => t.startsWith(lastToken));
    if (themes.length === 1) {
      return { match: `theme ${themes[0]}` };
    }
    if (themes.length > 1) {
      return { matches: themes };
    }
  }

  // Argument completions for 'sudo'
  if (cmd === "sudo") {
    if ("hire-me".startsWith(lastToken)) {
      return { match: "sudo hire-me" };
    }
  }

  return {};
}
