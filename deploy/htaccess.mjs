#!/usr/bin/env node
/**
 * Render Hostinger LiteSpeed .htaccess templates and per-host robots.txt (T10).
 *
 * Placeholders (__BASE__, __CURRENT__, __SHA__, __PREVIOUS__, __API_ORIGINS__)
 * are filled here. The deploy workflow calls these functions; it does not
 * edit the templates. Nothing in this module talks to FTP or the live hosts.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.join(HERE, "htaccess");

export const ENVS = ["dev", "staging", "production"];

export const HOSTS = {
  dev: "dev.yogeshkumarasamy.in",
  staging: "staging.yogeshkumarasamy.in",
  production: "yogeshkumarasamy.in",
};

export const SLUGS = ["portfolio", "ib-console", "ib", "yt-scheduler"];

const SHA_RE = /^[0-9a-f]{7,40}$/;
const ORIGIN_RE = /^https:\/\/[A-Za-z0-9.-]+(?::\d+)?(?:\/[A-Za-z0-9._~:@%+/=-]*)?$/;
const RULE_FLAGS = new Set(["L", "NC", "R=301", "R=302", "R=404"]);
const ALLOWED_DIRECTIVES = new Set([
  "Options",
  "DirectoryIndex",
  "RewriteEngine",
  "RewriteBase",
  "RewriteCond",
  "RewriteRule",
  "Header",
  "AddType",
  "Require",
]);

const TEMPLATE_FILES = [
  "root.htaccess.tpl",
  "router.htaccess.tpl",
  "release.htaccess.tpl",
  "previews.htaccess.tpl",
];

function readTemplate(name) {
  return readFileSync(path.join(TEMPLATE_DIR, name), "utf8");
}

export function assertEnv(env) {
  if (!ENVS.includes(env)) {
    throw new Error(`env must be dev, staging, or production, received ${env}`);
  }
  return env;
}

export function assertBase(base) {
  const slug = SLUGS.join("|");
  const re = new RegExp(`^/(?:${slug}|previews?/(?:${slug})/pr-[1-9][0-9]*)/$`);
  if (typeof base !== "string" || !re.test(base)) {
    throw new Error(`base must be /<slug>/ or /preview/<slug>/pr-<N>/, received ${base}`);
  }
  return base;
}

export function assertSha(sha, label = "sha") {
  const value = String(sha ?? "").toLowerCase();
  if (!SHA_RE.test(value)) {
    throw new Error(`${label} must be a 7–40 character hex git sha, received ${sha}`);
  }
  return value;
}

export function normalizeOrigins(value) {
  const list = Array.isArray(value) ? value : String(value ?? "").split(/\s+/).filter(Boolean);
  for (const origin of list) {
    if (!ORIGIN_RE.test(origin)) {
      throw new Error(`API origin must be an https URL without quotes or semicolons, received ${origin}`);
    }
  }
  return list.join(" ");
}

function omitLine(text, pattern, label) {
  const lines = text.split("\n");
  const index = lines.findIndex((line) => pattern.test(line.trim()));
  if (index === -1) throw new Error(`template is missing ${label}`);
  const next = lines.slice();
  next.splice(index, 1);
  if (index > 0 && next[index - 1].trim().startsWith("#")) next.splice(index - 1, 1);
  return next.join("\n");
}

function omitBlock(text, startPattern, endTrim, label) {
  const lines = text.split("\n");
  const start = lines.findIndex((line) => startPattern.test(line.trim()));
  if (start === -1) throw new Error(`template is missing ${label}`);
  let end = -1;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (lines[i].trim() === endTrim) {
      end = i;
      break;
    }
  }
  if (end === -1) throw new Error(`template is missing the end of ${label}`);
  let from = start;
  if (from > 0 && lines[from - 1].trim().startsWith("#")) from -= 1;
  return [...lines.slice(0, from), ...lines.slice(end + 1)].join("\n");
}

function fill(text, values) {
  let out = text;
  for (const [key, value] of Object.entries(values)) {
    if (String(value).includes("__")) {
      throw new Error(`value for __${key}__ must not contain placeholders`);
    }
    out = out.replaceAll(`__${key}__`, String(value));
  }
  const left = out.match(/__[A-Z0-9_]+__/g);
  if (left) throw new Error(`unresolved placeholder: ${left.join(", ")}`);
  return out.endsWith("\n") ? out : `${out}\n`;
}

export function lintHtaccess(text) {
  const errors = [];
  const stack = [];
  const lines = String(text).split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    const where = i + 1;
    if (!line || line.startsWith("#")) continue;
    if (line.includes("#")) errors.push(`${where}: comment must be on its own line`);
    if (/<\s*If(\s|>|$)/.test(line) || /\bHeader\s+edit\b/.test(line) || /\bexpr\s*=/.test(line)) {
      errors.push(`${where}: LiteSpeed-unsupported directive`);
    }
    if (line.startsWith("<")) {
      const close = line.match(/^<\/(IfModule|FilesMatch)>$/);
      const open = line.match(/^<(IfModule|FilesMatch)(\s[^>]*)?>$/);
      if (close) {
        const top = stack.pop();
        if (top !== close[1]) errors.push(`${where}: mismatched ${line}`);
      } else if (open) {
        stack.push(open[1]);
      } else {
        errors.push(`${where}: unsupported block ${line}`);
      }
      continue;
    }
    const directive = line.split(/\s+/)[0];
    if (!ALLOWED_DIRECTIVES.has(directive)) {
      errors.push(`${where}: directive ${directive} is outside the LiteSpeed subset`);
    }
    if (directive === "Options" && line !== "Options -Indexes") {
      errors.push(`${where}: only Options -Indexes is allowed`);
    }
    if (directive === "Header" && !/^Header\s+(always\s+)?set\s+\S+\s+"[^"]*"$/.test(line)) {
      errors.push(`${where}: Header must be "Header set" or "Header always set" with a quoted value`);
    }
    if (directive === "RewriteRule") {
      const flags = line.match(/\[([^\]]*)\]$/);
      if (!flags || !/\bL\b/.test(flags[1])) errors.push(`${where}: RewriteRule must include the L flag`);
      for (const flag of (flags?.[1] ?? "").split(",").map((item) => item.trim()).filter(Boolean)) {
        if (!RULE_FLAGS.has(flag)) errors.push(`${where}: RewriteRule flag ${flag} is outside the template subset`);
      }
    }
    if (directive === "RewriteCond") {
      const flags = line.match(/\[([^\]]*)\]$/);
      for (const flag of (flags?.[1] ?? "").split(",").map((item) => item.trim()).filter(Boolean)) {
        if (flag !== "NC") errors.push(`${where}: RewriteCond flag ${flag} is outside the template subset`);
      }
    }
  }
  if (stack.length) errors.push(`unclosed ${stack.join(", ")}`);
  return errors;
}

function finalize(text) {
  const errors = lintHtaccess(text);
  if (errors.length) {
    throw new Error(`rendered htaccess failed lint:\n${errors.join("\n")}`);
  }
  return text;
}

export function renderRoot({ env, apiOrigins = "" } = {}) {
  assertEnv(env);
  const origins = normalizeOrigins(apiOrigins);
  let text = readTemplate("root.htaccess.tpl");
  if (env === "production") {
    text = omitLine(text, /^Header always set X-Robots-Tag\b/, "X-Robots-Tag header");
  }
  if (origins) text = text.replaceAll("__API_ORIGINS__", origins);
  else text = text.replaceAll(" __API_ORIGINS__", "");
  return finalize(fill(text, {}));
}

export function renderRouter({ base, current } = {}) {
  return finalize(
    fill(readTemplate("router.htaccess.tpl"), {
      BASE: assertBase(base),
      CURRENT: assertSha(current, "current"),
    }),
  );
}

export function renderRelease({ base, sha, previous = "", phpApi = false } = {}) {
  const safeBase = assertBase(base);
  const safeSha = assertSha(sha, "sha");
  const safePrevious = previous ? assertSha(previous, "previous") : "";
  if (safePrevious && safePrevious === safeSha) {
    throw new Error("previous release sha must differ from the release being rendered");
  }
  let text = readTemplate("release.htaccess.tpl");
  if (!phpApi) {
    text = omitLine(text, /^RewriteRule \^api\/ api\/index\.php \[L\]$/, "Option B API rewrite");
    text = omitBlock(text, /^<FilesMatch "\\\.\(sql\|lock\|neon\|dist\|md\)\$">$/, "</FilesMatch>", "Option B deny block");
  }
  if (!safePrevious) {
    text = omitLine(text, /^RewriteRule \^assets\/\(\.\+\)\$ __BASE__releases\/__PREVIOUS__\/assets\/\$1 \[L\]$/, "previous-release asset rule");
  }
  return finalize(fill(text, { BASE: safeBase, SHA: safeSha, PREVIOUS: safePrevious }));
}

export function renderPreviews() {
  return finalize(fill(readTemplate("previews.htaccess.tpl"), {}));
}

export function lintRobots(env, text) {
  assertEnv(env);
  const errors = [];
  if (!text.endsWith("\n")) errors.push("robots.txt must end with a newline");
  if (env === "production") {
    if (!/^User-agent: \*\nAllow: \/\n\nSitemap: https:\/\/yogeshkumarasamy\.in\/portfolio\/sitemap\.xml\n$/.test(text)) {
      errors.push("production robots.txt must allow / and advertise the portfolio sitemap");
    }
    if (text.includes("Disallow")) errors.push("production robots.txt must not Disallow");
  } else if (!/^User-agent: \*\nDisallow: \/\n$/.test(text)) {
    errors.push(`${env} robots.txt must be User-agent: * / Disallow: /`);
  }
  return errors;
}

export function readRobots(env) {
  assertEnv(env);
  const text = readFileSync(path.join(TEMPLATE_DIR, `robots.${env}.txt`), "utf8");
  const errors = lintRobots(env, text);
  if (errors.length) throw new Error(errors.join("\n"));
  return text;
}

export function lintTemplates() {
  const errors = [];
  for (const name of TEMPLATE_FILES) {
    for (const error of lintHtaccess(readTemplate(name))) errors.push(`${name}: ${error}`);
  }
  for (const env of ENVS) {
    try {
      readRobots(env);
    } catch (error) {
      errors.push(`robots.${env}.txt: ${error.message}`);
    }
  }
  return errors;
}

function flag(argv, name) {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`missing value for ${name}`);
  return value;
}

function printRendered(text) {
  process.stdout.write(text);
}

export function runCli(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(
      [
        "usage: node deploy/htaccess.mjs <root|router|release|previews|robots|check> [options]",
        "  root      --env <dev|staging|production> [--api-origins <https://…>]",
        "  router    --base </slug/> --current <sha>",
        "  release   --base </slug/> --sha <sha> [--previous <sha>] [--php-api]",
        "  previews",
        "  robots    --env <dev|staging|production>",
        "  check",
        "",
      ].join("\n"),
    );
    return command ? 0 : 1;
  }
  if (command === "check") {
    const errors = lintTemplates();
    renderRoot({ env: "dev" });
    renderRoot({ env: "staging" });
    renderRoot({ env: "production" });
    renderRouter({ base: "/portfolio/", current: "0123456789abcdef" });
    renderRelease({ base: "/ib-console/", sha: "0123456789abcdef", previous: "fedcba9876543210" });
    renderRelease({ base: "/yt-scheduler/", sha: "0123456789abcdef", phpApi: true });
    renderPreviews();
    if (errors.length) {
      process.stderr.write(`${errors.join("\n")}\n`);
      return 1;
    }
    process.stdout.write("ok\n");
    return 0;
  }
  if (command === "root") {
    printRendered(renderRoot({ env: flag(rest, "--env"), apiOrigins: flag(rest, "--api-origins") ?? "" }));
    return 0;
  }
  if (command === "router") {
    printRendered(renderRouter({ base: flag(rest, "--base"), current: flag(rest, "--current") }));
    return 0;
  }
  if (command === "release") {
    printRendered(
      renderRelease({
        base: flag(rest, "--base"),
        sha: flag(rest, "--sha"),
        previous: flag(rest, "--previous") ?? "",
        phpApi: rest.includes("--php-api"),
      }),
    );
    return 0;
  }
  if (command === "previews") {
    printRendered(renderPreviews());
    return 0;
  }
  if (command === "robots") {
    printRendered(readRobots(flag(rest, "--env")));
    return 0;
  }
  throw new Error(`unknown command ${command}`);
}

function invokedAsCli() {
  const entry = process.argv[1];
  if (!entry) return false;
  return path.resolve(entry) === fileURLToPath(import.meta.url);
}

if (invokedAsCli()) {
  try {
    process.exitCode = runCli();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
