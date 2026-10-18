#!/usr/bin/env node
/**
 * FTP release engine (T09).
 *
 * Uploads a finished dist to <slug>/releases/<sha>.partial, renames that
 * directory onto <sha>, then points the slug router .htaccess at it.
 * Nothing in the live release is modified during the upload.
 *
 * Hostinger Single is FTP only. T08 has not confirmed rename-over-existing,
 * so the router switch tries rename-over and falls back to rm + mv.
 * Templates are owned by T10 (deploy/htaccess/*.tpl). This file only renders them.
 *
 * Local runs refuse any FTP host that is not loopback unless FTP_ALLOW_REMOTE=1.
 * The reusable workflow sets that flag. Tests must not.
 */

import { spawn, spawnSync } from "node:child_process";
import {
  appendFileSync,
  createWriteStream,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const TEMPLATE_PATHS = {
  release: path.join(HERE, "htaccess", "release.htaccess.tpl"),
  router: path.join(HERE, "htaccess", "router.htaccess.tpl"),
};

export const PUBLIC_ORIGINS = {
  preview: "https://dev.yogeshkumarasamy.in",
  dev: "https://dev.yogeshkumarasamy.in",
  staging: "https://staging.yogeshkumarasamy.in",
  production: "https://yogeshkumarasamy.in",
};

const SHA_RE = /^[0-9a-f]{7,40}$/;
const APP_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PREVIEW_SLUG_RE = /^previews?\/[a-z0-9]+(?:-[a-z0-9]+)*\/pr-[1-9][0-9]*$/;
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);
const ENVS = new Set(["preview", "dev", "staging", "production"]);

export function publicOriginFor(env) {
  const origin = PUBLIC_ORIGINS[env];
  if (!origin) throw new Error(`No public origin for env ${env}`);
  return origin;
}

export function assertRemoteAllowed(host, allowRemote) {
  if (!host || typeof host !== "string" || /[\s/\\]/.test(host)) {
    throw new Error("FTP host is invalid");
  }
  if (LOCAL_HOSTS.has(host)) return;
  if (allowRemote) return;
  throw new Error(
    `Refusing FTP host ${host} without FTP_ALLOW_REMOTE=1. Tests must stay on 127.0.0.1 and must not use the Hostinger account.`,
  );
}

export function remoteJoin(envDir, ...parts) {
  const absolute = typeof envDir === "string" && envDir.startsWith("/");
  const segments = [envDir, ...parts]
    .flatMap((part) => String(part ?? "").split("/"))
    .filter((part) => part.length > 0);
  if (segments.some((part) => part === "." || part === "..")) {
    throw new Error("Remote path must not contain . or ..");
  }
  const joined = segments.join("/");
  return absolute ? `/${joined}` : joined;
}

export function renderTemplate(template, vars, { omitTokens = [] } = {}) {
  const lines = String(template).replace(/\r\n/g, "\n").split("\n");
  const rendered = [];
  for (const line of lines) {
    if (omitTokens.some((token) => line.includes(`__${token}__`))) continue;
    const next = line.replace(/__([A-Z0-9_]+)__/g, (full, key) => {
      if (!Object.prototype.hasOwnProperty.call(vars, key)) return full;
      return String(vars[key] ?? "");
    });
    const leftover = next.match(/__[A-Z0-9_]+__/g);
    if (leftover) throw new Error(`Unresolved template token ${leftover.join(", ")}`);
    rendered.push(next);
  }
  const text = rendered.join("\n");
  return text.endsWith("\n") ? text : `${text}\n`;
}

export function parseRouterSha(htaccess) {
  const match = String(htaccess).match(
    /RewriteRule\s+\^\(\.\*\)\$\s+releases\/([0-9a-f]{7,40})\/\$1\s+\[L\]/,
  );
  return match?.[1] ?? null;
}

export function parsePreviousSha(htaccess) {
  const match = String(htaccess).match(/releases\/([0-9a-f]{7,40})\/assets\//);
  return match?.[1] ?? null;
}

export function parseClsNames(stdout) {
  const entries = [];
  for (const raw of String(stdout).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const dir = line.endsWith("/");
    const withoutSlash = dir ? line.slice(0, -1) : line;
    const name = withoutSlash.includes("/")
      ? withoutSlash.slice(withoutSlash.lastIndexOf("/") + 1)
      : withoutSlash;
    if (!/^[A-Za-z0-9._-]+$/.test(name) || name === "." || name === "..") continue;
    entries.push({ name, type: dir ? "dir" : "file" });
  }
  return entries;
}

/**
 * Newest `keep` releases by builtAt, always unioned with the live and previous SHAs.
 * @param {{ name: string, builtAtMs: number }[]} releases
 */
export function selectReleasesToPrune(releases, { keep, current, previous }) {
  const ranked = [...releases].sort((a, b) => {
    const delta = (b.builtAtMs ?? 0) - (a.builtAtMs ?? 0);
    if (delta !== 0) return delta;
    if (a.name === b.name) return 0;
    return a.name < b.name ? 1 : -1;
  });
  const keepNames = new Set(ranked.slice(0, keep).map((release) => release.name));
  if (current) keepNames.add(current);
  if (previous) keepNames.add(previous);
  return {
    prune: ranked.filter((release) => !keepNames.has(release.name)).map((release) => release.name),
    keep: ranked.filter((release) => keepNames.has(release.name)).map((release) => release.name),
  };
}

export function isAncestor(liveSha, sha, { cwd } = {}) {
  if (!liveSha) return { ok: true, reason: "no-live-release" };
  if (!SHA_RE.test(liveSha) || !SHA_RE.test(sha)) return { ok: false, reason: "invalid-sha" };
  if (liveSha === sha) return { ok: true, reason: "same-sha" };
  const result = spawnSync("git", ["merge-base", "--is-ancestor", liveSha, sha], {
    cwd,
    encoding: "utf8",
  });
  if (result.status === 0) return { ok: true, reason: "ancestor" };
  if (result.status === 1) return { ok: false, reason: "not-ancestor" };
  return {
    ok: false,
    reason: "unknown-live-sha",
    detail: (result.stderr || result.stdout || "").trim(),
  };
}

export function firstAssetReference(html) {
  const match = String(html).match(/(?:src|href)=["']([^"']*assets\/[^"']+\.js)["']/);
  return match?.[1] ?? null;
}

export function validateDeploy(settings) {
  const errors = [];
  if (!ENVS.has(settings.env)) errors.push("env must be preview, dev, staging, or production");
  if (!APP_SLUG_RE.test(settings.target ?? "")) errors.push("target must be a slug");
  if (!(APP_SLUG_RE.test(settings.slugDir ?? "") || PREVIEW_SLUG_RE.test(settings.slugDir ?? ""))) {
    errors.push("slug_dir must be <slug> or preview/<slug>/pr-<N>");
  }
  if (settings.slugDir && settings.base !== `/${settings.slugDir}/`) {
    errors.push(`base must be /${settings.slugDir}/ (the site path, not the planner git SHA)`);
  }
  if (!SHA_RE.test(settings.sha ?? "")) errors.push("sha must be 7-40 lowercase hex characters");
  if (settings.apiBaseUrl && !/^https?:\/\/[^\s]+$/.test(settings.apiBaseUrl)) {
    errors.push("api_base_url must be an http(s) URL or empty");
  }
  if (!["auto", "rename-over", "rm-then-mv"].includes(settings.switchMode)) {
    errors.push("FTP_ROUTER_SWITCH must be auto, rename-over, or rm-then-mv");
  }
  if (!["require", "off"].includes(settings.ssl)) errors.push("FTP_SSL must be require or off");
  if (!tlsCheckHostnameValue(settings.tlsCheckHostname)) {
    errors.push("FTP_TLS_CHECK_HOSTNAME must be yes or no");
  }
  if (!Number.isInteger(settings.port) || settings.port < 1 || settings.port > 65535) {
    errors.push("FTP port is invalid");
  }
  if (!Number.isInteger(settings.keep) || settings.keep < 1 || settings.keep > 20) {
    errors.push("RELEASE_KEEP must be an integer from 1 to 20");
  }
  if (!Number.isInteger(settings.smokeRetries) || settings.smokeRetries < 1) {
    errors.push("SMOKE_RETRIES must be an integer >= 1");
  }
  assertEnvDir(settings.envDir, errors);
  if (!settings.host) errors.push("FTP_HOST is required (GitHub Environment secret FTP_HOST)");
  if (!settings.user) errors.push("FTP_USER is required (GitHub Environment secret FTP_USERNAME)");
  if (!settings.password) errors.push("FTP_PASS is required (GitHub Environment secret FTP_PASSWORD)");
  if (settings.password && /[\r\n]/.test(settings.password)) errors.push("FTP password must not contain newlines");
  if (settings.user && /[\r\n"]/.test(settings.user)) errors.push("FTP user must not contain quotes or newlines");
  if (errors.length > 0) throw new Error(errors.join("; "));
  assertRemoteAllowed(settings.host, settings.allowRemote);
  return settings;
}

function assertEnvDir(envDir, errors) {
  if (envDir == null || envDir === "" || envDir === "/") return;
  if (typeof envDir !== "string" || /[\r\n\0]/.test(envDir)) {
    errors.push("FTP_ENV_DIR is invalid");
    return;
  }
  const parts = envDir.split("/");
  if (parts.some((part) => part === "." || part === "..")) {
    errors.push("FTP_ENV_DIR must not contain . or ..");
    return;
  }
  if (!/^\/?[A-Za-z0-9._/-]+$/.test(envDir)) errors.push("FTP_ENV_DIR has unsupported characters");
}

function resolveSettings(options = {}) {
  const env = process.env;
  const port = Number(options.port ?? env.FTP_PORT ?? 21);
  const keep = Number(options.keep ?? env.RELEASE_KEEP ?? 5);
  return {
    host: options.host ?? env.FTP_HOST ?? "",
    port,
    user: options.user ?? env.FTP_USER ?? "",
    password: options.password ?? env.FTP_PASS ?? "",
    envDir: options.envDir ?? env.FTP_ENV_DIR ?? "",
    ssl: options.ssl ?? env.FTP_SSL ?? "require",
    // Hostinger's cert is for *.hstgr.io. FTP_HOST is an IP, so the name
    // check fails. Default no keeps the chain check and skips only the name.
    tlsCheckHostname: options.tlsCheckHostname ?? env.FTP_TLS_CHECK_HOSTNAME ?? "no",
    allowRemote: options.allowRemote ?? env.FTP_ALLOW_REMOTE === "1",
    switchMode: options.switchMode ?? env.FTP_ROUTER_SWITCH ?? "auto",
    env: options.env ?? env.DEPLOY_ENV ?? "",
    target: options.target ?? env.DEPLOY_TARGET ?? "",
    slugDir: options.slugDir ?? env.SLUG_DIR ?? "",
    base: options.base ?? env.SITE_BASE ?? "",
    sha: (options.sha ?? env.DEPLOY_SHA ?? "").trim(),
    apiBaseUrl: options.apiBaseUrl ?? env.API_BASE_URL ?? "",
    publicOrigin: options.publicOrigin ?? env.PUBLIC_ORIGIN ?? "",
    dist: path.resolve(options.dist ?? env.DIST_DIR ?? "dist"),
    keep,
    smokeRetries: Number(options.smokeRetries ?? env.SMOKE_RETRIES ?? 5),
    smokeDelayMs: Number(options.smokeDelayMs ?? env.SMOKE_DELAY_MS ?? 6000),
    skipSmoke: options.skipSmoke ?? env.SKIP_SMOKE === "1",
    repo: options.repo ?? env.GIT_REPO ?? process.cwd(),
    releaseTemplate: options.releaseTemplate ?? env.RELEASE_HTACCESS_TEMPLATE ?? TEMPLATE_PATHS.release,
    routerTemplate: options.routerTemplate ?? env.ROUTER_HTACCESS_TEMPLATE ?? TEMPLATE_PATHS.router,
    builtAt: options.builtAt,
    now: options.now ?? (() => new Date()),
  };
}

function resolveOrigin(settings) {
  if (settings.skipSmoke) return "";
  if (settings.publicOrigin) return String(settings.publicOrigin).replace(/\/$/, "");
  if (settings.allowRemote) return publicOriginFor(settings.env);
  return "";
}

function assertPublicOriginAllowed(origin, allowRemote) {
  if (!origin) return;
  let hostname;
  try {
    hostname = new URL(origin).hostname;
  } catch {
    throw new Error(`public origin is not a URL: ${origin}`);
  }
  assertRemoteAllowed(hostname, allowRemote);
}

function readTemplate(file) {
  if (!existsSync(file)) {
    throw new Error(
      `Missing htaccess template ${file}. T10 (#74) owns deploy/htaccess/release.htaccess.tpl and deploy/htaccess/router.htaccess.tpl. Set RELEASE_HTACCESS_TEMPLATE and ROUTER_HTACCESS_TEMPLATE to override.`,
    );
  }
  return readFileSync(file, "utf8");
}

export function createLftpTransport(settings) {
  const session = createLftpSession(settings);
  return {
    async mkdirp(remote) {
      // pure-ftpd returns 550 when the directory already exists. lftp mkdir -p
      // does not treat that as success. Hostinger may do the same (T08).
      await session.exec([`mkdir -p ${lftpQuote(remote)} || echo __EXISTS__`]);
    },
    async remove(remote, { recursive = true } = {}) {
      const flags = recursive ? "-f -r" : "-f";
      await session.exec([`rm ${flags} ${lftpQuote(remote)} || echo __REMOVED__`]);
    },
    async move(from, to) {
      const out = await session.exec([`mv ${lftpQuote(from)} ${lftpQuote(to)} || echo __MV_FAIL__`]);
      if (out.includes("__MV_FAIL__")) {
        throw new Error(`mv failed for ${from} -> ${to}`);
      }
    },
    async put(localFile, remote) {
      await session.exec([`put ${lftpQuote(localFile)} -o ${lftpQuote(remote)}`]);
    },
    async get(remote, localFile) {
      const out = await session.exec([
        `get ${lftpQuote(remote)} -o ${lftpQuote(localFile)} || echo __MISS__`,
      ]);
      if (out.includes("__MISS__")) return false;
      return existsSync(localFile);
    },
    async list(remote) {
      const out = await session.exec([
        "cache flush",
        `cls -1F --basename ${lftpQuote(remote)}`,
      ]);
      return parseClsNames(out);
    },
    async mirror(localDir, remote) {
      await session.exec([`mirror -R --parallel=2 ${lftpQuote(localDir)} ${lftpQuote(remote)}`]);
    },
    close: () => session.close(),
  };
}

function lftpQuote(value) {
  const text = String(value);
  if (/[\r\n]/.test(text)) throw new Error("lftp argument must not contain newlines");
  return `"${text.replace(/[\\"`$`]/g, "\\$&")}"`;
}

function redact(text, secret) {
  if (!secret) return text ?? "";
  return String(text ?? "").split(secret).join("***");
}

export function tlsCheckHostnameValue(value) {
  if (value == null || String(value).trim() === "") return "no";
  const text = String(value).trim().toLowerCase();
  if (text === "yes" || text === "no") return text;
  return null;
}

export function sslLines(settings) {
  if (settings.ssl === "require") {
    const check = tlsCheckHostnameValue(settings.tlsCheckHostname);
    if (!check) throw new Error("FTP_TLS_CHECK_HOSTNAME must be yes or no");
    return [
      "set ftp:ssl-force true",
      "set ftp:ssl-protect-data true",
      "set ssl:verify-certificate yes",
      `set ssl:check-hostname ${check}`,
    ];
  }
  return ["set ftp:ssl-allow false", "set ssl:verify-certificate no"];
}

function createLftpSession(settings) {
  const dir = mkdtempSync(path.join(tmpdir(), "lftp-session-"));
  const fifo = path.join(dir, "fifo");
  const made = spawnSync("mkfifo", [fifo]);
  if (made.status !== 0) throw new Error("mkfifo failed");

  let child = null;
  let input = null;
  let combined = "";
  let pending = null;
  let opened = false;
  let closed = false;

  const preamble = [
    "set cmd:fail-exit yes",
    "set cmd:interactive false",
    "set net:max-retries 3",
    "set net:timeout 30",
    "set ftp:passive-mode on",
    "set xfer:clobber on",
    ...sslLines(settings),
    `open ${lftpQuote(`ftp://${settings.host}:${settings.port}`)}`,
    `user ${lftpQuote(settings.user)} ${lftpQuote(settings.password)}`,
  ];

  function settle() {
    if (!pending) return;
    const slice = combined.slice(pending.start);
    if (!slice.includes(pending.marker)) return;
    const { resolve, marker } = pending;
    pending = null;
    resolve(redact(slice.split(marker).join(""), settings.password));
  }

  function ensure() {
    if (child || closed) return;
    child = spawn("lftp", ["-f", fifo], { stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (buf) => {
      combined += buf.toString();
      settle();
    });
    child.stderr.on("data", (buf) => {
      combined += buf.toString();
      settle();
    });
    child.on("exit", (code) => {
      if (pending) {
        const { reject, start } = pending;
        pending = null;
        reject(new Error(`lftp exited ${code}: ${redact(combined.slice(start), settings.password).trim()}`));
      }
      child = null;
    });
    input = createWriteStream(fifo);
  }

  function exec(commands) {
    if (closed) return Promise.reject(new Error("lftp session is closed"));
    ensure();
    const batch = opened ? commands : [...preamble, ...commands];
    opened = true;
    const marker = `__DONE_${Math.random().toString(16).slice(2)}__`;
    const start = combined.length;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!pending || pending.marker !== marker) return;
        pending = null;
        if (child) child.kill("SIGKILL");
        reject(new Error(`lftp timed out: ${commands.join("; ")}`));
      }, 60000);
      pending = {
        marker,
        start,
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
      for (const command of batch) input.write(`${command}\n`);
      input.write(`echo ${marker}\n`);
      settle();
    });
  }

  async function close() {
    if (closed) return;
    closed = true;
    if (child && input) {
      input.write("bye\n");
      await new Promise((resolve) => {
        if (!child) return resolve();
        child.once("exit", () => resolve());
        setTimeout(() => {
          if (child) child.kill("SIGKILL");
          resolve();
        }, 5000);
      });
    }
    if (input) input.end();
    rmSync(dir, { recursive: true, force: true });
  }

  return { exec, close };
}

async function readLive(transport, settings) {
  const routerPath = remoteJoin(settings.envDir, settings.slugDir, ".htaccess");
  const routerFile = path.join(settings.workDir, "live-router.htaccess");
  const found = await transport.get(routerPath, routerFile);
  if (!found) return null;
  const folderSha = parseRouterSha(readFileSync(routerFile, "utf8"));
  if (!folderSha) return null;
  const jsonPath = remoteJoin(settings.envDir, settings.slugDir, "releases", folderSha, ".release.json");
  const jsonFile = path.join(settings.workDir, "live-release.json");
  const hasJson = await transport.get(jsonPath, jsonFile);
  if (!hasJson) return { sha: folderSha, folderSha };
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(jsonFile, "utf8"));
  } catch {
    throw new Error(`Live .release.json for ${folderSha} is not JSON`);
  }
  if (parsed.sha !== folderSha) {
    throw new Error(`Live router points at ${folderSha} but .release.json says ${parsed.sha}`);
  }
  return { sha: parsed.sha, folderSha };
}

function stageDist(settings, releaseTemplate, previousSha, builtAt) {
  const releaseHtaccess = renderTemplate(
    releaseTemplate,
    { BASE: settings.base, SHA: settings.sha, PREVIOUS: previousSha },
    { omitTokens: previousSha ? [] : ["PREVIOUS"] },
  );
  writeFileSync(path.join(settings.dist, ".htaccess"), releaseHtaccess);
  writeFileSync(
    path.join(settings.dist, ".release.json"),
    `${JSON.stringify({ sha: settings.sha, target: settings.target, builtAt }, null, 2)}\n`,
  );
  writeFileSync(
    path.join(settings.dist, "app-config.json"),
    `${JSON.stringify(
      { env: settings.env, apiBaseUrl: settings.apiBaseUrl, sha: settings.sha },
      null,
      2,
    )}\n`,
  );
  const legacyState = path.join(settings.dist, ".ftp-deploy-sync-state.json");
  if (existsSync(legacyState)) rmSync(legacyState);
  return releaseHtaccess;
}

async function releaseAlreadyPublished(transport, settings) {
  const jsonPath = remoteJoin(settings.envDir, settings.slugDir, "releases", settings.sha, ".release.json");
  const tmp = path.join(settings.workDir, "existing-release.json");
  const found = await transport.get(jsonPath, tmp);
  if (!found) return false;
  try {
    const parsed = JSON.parse(readFileSync(tmp, "utf8"));
    return parsed.sha === settings.sha && parsed.target === settings.target;
  } catch {
    return false;
  }
}

async function removePartial(transport, settings) {
  const releases = remoteJoin(settings.envDir, settings.slugDir, "releases");
  const partialName = `${settings.sha}.partial`;
  const entries = await transport.list(releases);
  if (entries.some((entry) => entry.name === partialName)) {
    await transport.remove(remoteJoin(releases, partialName), { recursive: true });
  }
}

async function uploadRelease(transport, settings) {
  const releases = remoteJoin(settings.envDir, settings.slugDir, "releases");
  const partialName = `${settings.sha}.partial`;
  const partial = remoteJoin(releases, partialName);
  const dest = remoteJoin(releases, settings.sha);
  await transport.mkdirp(releases);
  const before = await transport.list(releases);
  if (before.some((entry) => entry.name === partialName)) {
    await transport.remove(partial, { recursive: true });
  }
  await transport.mirror(settings.dist, partial);
  const during = await transport.list(releases);
  if (during.some((entry) => entry.name === settings.sha)) {
    // Same SHA retry only. Directory rename-over is not used; T08 has not confirmed it.
    await transport.remove(dest, { recursive: true });
  }
  await transport.move(partial, dest);
}

async function patchReleaseHtaccess(transport, settings, releaseTemplate, previousSha) {
  const contents = renderTemplate(
    releaseTemplate,
    { BASE: settings.base, SHA: settings.sha, PREVIOUS: previousSha },
    { omitTokens: previousSha ? [] : ["PREVIOUS"] },
  );
  const local = path.join(settings.workDir, "patched-release.htaccess");
  writeFileSync(local, contents);
  const remote = remoteJoin(settings.envDir, settings.slugDir, "releases", settings.sha, ".htaccess");
  await transport.put(local, remote);
  writeFileSync(path.join(settings.dist, ".htaccess"), contents);
}

async function switchRouter(transport, settings, contents) {
  const local = path.join(settings.workDir, "router.htaccess");
  writeFileSync(local, contents);
  const dir = remoteJoin(settings.envDir, settings.slugDir);
  const fresh = remoteJoin(dir, ".htaccess.new");
  const live = remoteJoin(dir, ".htaccess");
  await transport.put(local, fresh);
  if (settings.switchMode !== "rm-then-mv") {
    try {
      await transport.move(fresh, live);
      return "rename-over";
    } catch (error) {
      if (settings.switchMode === "rename-over") throw error;
      settings.log(`ftp-release: rename-over failed (${error.message}); using rm + mv`);
    }
  }
  try {
    await transport.remove(live, { recursive: false });
  } catch (error) {
    const text = `${error.message}`;
    if (!/550|No such file|Can't|Failed to open/i.test(text)) throw error;
  }
  await transport.move(fresh, live);
  return "rm-then-mv";
}

function renderRouter(template, settings, current) {
  return renderTemplate(template, { BASE: settings.base, CURRENT: current });
}

export async function smokeCheck({
  origin,
  base,
  sha,
  fetchImpl = globalThis.fetch,
  retries = 5,
  delayMs = 6000,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const root = new URL(base, `${origin}/`).href;
  let lastError = "smoke did not run";
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const releaseUrl = new URL(".release.json", root);
      const releaseResponse = await fetchImpl(releaseUrl, { cache: "no-store" });
      if (!releaseResponse.ok) throw new Error(`.release.json HTTP ${releaseResponse.status}`);
      const body = await releaseResponse.json();
      if (body.sha !== sha) throw new Error(`live sha ${body.sha} != ${sha}`);
      const indexResponse = await fetchImpl(new URL("index.html", root), { cache: "no-store" });
      if (indexResponse.status !== 200) throw new Error(`index.html HTTP ${indexResponse.status}`);
      const html = await indexResponse.text();
      const assetRef = firstAssetReference(html);
      if (!assetRef) throw new Error("index.html does not reference assets/*.js");
      const assetResponse = await fetchImpl(new URL(assetRef, new URL("index.html", root)), {
        cache: "no-store",
      });
      if (assetResponse.status !== 200) throw new Error(`asset HTTP ${assetResponse.status}`);
      const contentType = assetResponse.headers.get("content-type") || "";
      if (!/javascript|ecmascript/i.test(contentType)) {
        throw new Error(`asset content-type ${contentType || "(missing)"}`);
      }
      return { ok: true, skipped: false, attempt };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < retries) await sleep(delayMs);
    }
  }
  return { ok: false, skipped: false, error: lastError, attempt: retries };
}

async function pruneReleases(transport, settings, { current, previous }) {
  const releasesDir = remoteJoin(settings.envDir, settings.slugDir, "releases");
  const entries = await transport.list(releasesDir);
  const partials = entries
    .filter((entry) => entry.type === "dir" && entry.name.endsWith(".partial"))
    .map((entry) => entry.name);
  const named = entries.filter((entry) => entry.type === "dir" && SHA_RE.test(entry.name));
  const annotated = [];
  for (const entry of named) {
    const jsonPath = remoteJoin(releasesDir, entry.name, ".release.json");
    const tmp = path.join(settings.workDir, `prune-${entry.name}.json`);
    let builtAtMs = 0;
    if (await transport.get(jsonPath, tmp)) {
      try {
        const parsed = JSON.parse(readFileSync(tmp, "utf8"));
        const ms = Date.parse(parsed.builtAt);
        if (!Number.isNaN(ms)) builtAtMs = ms;
      } catch {
        builtAtMs = 0;
      }
    }
    annotated.push({ name: entry.name, builtAtMs });
  }
  const decision = selectReleasesToPrune(annotated, {
    keep: settings.keep,
    current,
    previous,
  });
  if (decision.prune.includes(current) || (previous && decision.prune.includes(previous))) {
    throw new Error("Refusing to prune the live or previous release");
  }
  for (const name of decision.prune) {
    await transport.remove(remoteJoin(releasesDir, name), { recursive: true });
  }
  for (const name of partials) {
    await transport.remove(remoteJoin(releasesDir, name), { recursive: true });
  }
  return decision.prune;
}

function resultBase(settings, extra) {
  return {
    target: settings.target,
    env: settings.env,
    sha: settings.sha,
    previous: "",
    live: "",
    switchMode: "",
    pruned: [],
    guard: null,
    smoke: { ok: true, skipped: true },
    ...extra,
  };
}

export async function publishRelease(options = {}, deps = {}) {
  const settings = resolveSettings(options);
  settings.log = deps.log ?? ((message) => console.error(message));
  validateDeploy(settings);
  const origin = resolveOrigin(settings);
  assertPublicOriginAllowed(origin, settings.allowRemote);
  const releaseTemplate = readTemplate(settings.releaseTemplate);
  const routerTemplate = readTemplate(settings.routerTemplate);
  if (!existsSync(path.join(settings.dist, "index.html"))) {
    throw new Error(`dist ${settings.dist} is missing index.html`);
  }
  const workDir = mkdtempSync(path.join(tmpdir(), "ftp-release-"));
  settings.workDir = workDir;
  const transport = deps.transport ?? createLftpTransport(settings);
  const ancestor = deps.isAncestor ?? isAncestor;
  try {
    const before = await readLive(transport, settings);
    const bakedPrev = before?.sha ?? "";
    const builtAt = settings.builtAt ?? settings.now().toISOString();
    const alreadyPublished = await releaseAlreadyPublished(transport, settings);
    if (alreadyPublished) {
      // A retry or a superseded rerun must not rewrite a release that is already
      // in the old-tab fallback chain.
      settings.log(`ftp-release: ${settings.sha} is already published; leaving that folder untouched`);
      await removePartial(transport, settings);
    } else {
      stageDist(settings, releaseTemplate, bakedPrev, builtAt);
      settings.log(`ftp-release: upload ${settings.slugDir} ${settings.sha}`);
      await uploadRelease(transport, settings);
      const duringUpload = await readLive(transport, settings);
      const liveNow = duringUpload?.sha ?? "";
      if (liveNow !== bakedPrev) {
        settings.log(
          `ftp-release: live sha changed during upload (${bakedPrev || "none"} -> ${liveNow || "none"})`,
        );
        await patchReleaseHtaccess(transport, settings, releaseTemplate, liveNow);
      }
    }

    const during = await readLive(transport, settings);
    const previous = during?.sha ?? "";

    const guard = ancestor(previous, settings.sha, { cwd: settings.repo });
    if (!guard.ok) {
      const message = `Deploy superseded: live ${previous || "(none)"} is not an ancestor of ${settings.sha} (${guard.reason})`;
      settings.log(`ftp-release: ${message}`);
      if (process.env.GITHUB_ACTIONS) console.log(`::warning title=superseded::${message}`);
      return resultBase(settings, {
        result: "superseded",
        previous,
        live: previous,
        guard,
      });
    }

    const switchMode = await switchRouter(
      transport,
      settings,
      renderRouter(routerTemplate, settings, settings.sha),
    );
    settings.log(`ftp-release: switched ${settings.slugDir} via ${switchMode}`);

    let smoke = { ok: true, skipped: true };
    if (origin) {
      smoke = await smokeCheck({
        origin,
        base: settings.base,
        sha: settings.sha,
        fetchImpl: deps.fetch ?? globalThis.fetch,
        retries: settings.smokeRetries,
        delayMs: settings.smokeDelayMs,
        sleep: deps.sleep,
      });
      if (!smoke.ok) {
        if (!previous) {
          settings.log(`ftp-release: smoke failed and there is no previous release (${smoke.error})`);
          return resultBase(settings, {
            result: "failed",
            previous: "",
            live: settings.sha,
            switchMode,
            guard,
            smoke,
          });
        }
        settings.log(`ftp-release: smoke failed (${smoke.error}); switching back to ${previous}`);
        const rollbackMode = await switchRouter(
          transport,
          settings,
          renderRouter(routerTemplate, settings, previous),
        );
        return resultBase(settings, {
          result: "rolled-back",
          previous,
          live: previous,
          switchMode: rollbackMode,
          guard,
          smoke,
        });
      }
    }

    const pruned = await pruneReleases(transport, settings, {
      current: settings.sha,
      previous,
    });
    if (pruned.length > 0) settings.log(`ftp-release: pruned ${pruned.join(", ")}`);
    return resultBase(settings, {
      result: "deployed",
      previous,
      live: settings.sha,
      switchMode,
      pruned,
      guard,
      smoke,
    });
  } finally {
    if (typeof transport.close === "function") await transport.close();
    rmSync(workDir, { recursive: true, force: true });
  }
}

function writeGitHubOutputs(result) {
  const pairs = {
    result: result.result ?? "failed",
    previous: result.previous ?? "",
    live: result.live ?? "",
    switch: result.switchMode ?? "",
  };
  if (process.env.GITHUB_OUTPUT) {
    const lines = Object.entries(pairs)
      .map(([key, value]) => `${key}=${String(value).replace(/[\r\n]/g, "")}`)
      .join("\n");
    appendFileSync(process.env.GITHUB_OUTPUT, `${lines}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const pruned = result.pruned?.length ? result.pruned.join(", ") : "(none)";
    const summary = [
      "## FTP release",
      "",
      `- Result: \`${pairs.result}\``,
      `- Target: \`${result.target || ""}\` (\`${result.env || ""}\`)`,
      `- SHA: \`${result.sha || ""}\``,
      `- Previous: \`${pairs.previous || "(none)"}\``,
      `- Live: \`${pairs.live || "(none)"}\``,
      `- Switch: \`${pairs.switch || "(not switched)"}\``,
      `- Pruned: ${pruned}`,
      "",
    ].join("\n");
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }
}

function invokedDirectly() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (invokedDirectly()) {
  publishRelease()
    .then((result) => {
      writeGitHubOutputs(result);
      const ok = result.result === "deployed" || result.result === "superseded";
      process.exitCode = ok ? 0 : 1;
    })
    .catch((error) => {
      console.error(`ftp-release: ${error instanceof Error ? error.message : String(error)}`);
      writeGitHubOutputs({ result: "failed", previous: "", live: "", switchMode: "" });
      process.exitCode = 1;
    });
}
