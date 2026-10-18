#!/usr/bin/env node
/**
 * Deploy planner (T07).
 *
 * Turns changed files and `turbo query affected --tasks build` output into
 * the targets to test, build, and deploy, and the API URL each UI uses.
 * Writes plan.json as an array suitable for strategy.matrix.include.
 *
 * Does not talk to FTP, Wrangler, or GitHub Actions. Later tickets wire it in.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_TARGETS = path.join(HERE, "targets.json");

const HOSTS = {
  preview: "dev.yogeshkumarasamy.in",
  dev: "dev.yogeshkumarasamy.in",
  staging: "staging.yogeshkumarasamy.in",
  production: "yogeshkumarasamy.in",
};

const REFS = {
  main: "dev",
  "release/staging": "staging",
  "release/production": "production",
};

/** Package name → directory. The contract package is not a deploy target. */
const CONTRACT_ROOTS = {
  "@contracts/innings-break": "packages/innings-break-contract",
};

const DEPENDENCY_REASONS = new Set([
  "DependencyChanged",
  "DependentChanged",
  "TaskDependencyChanged",
]);

const ENTRY_KEYS = [
  "target",
  "kind",
  "env",
  "base",
  "path",
  "apiBaseUrl",
  "reason",
  "host",
  "d1",
  "freshDb",
  "schemaChanged",
  "contractCheck",
];

export function loadTargets(file = DEFAULT_TARGETS) {
  const targets = JSON.parse(readFileSync(file, "utf8"));
  for (const [name, target] of Object.entries(targets)) {
    if (!target || typeof target.package !== "string" || typeof target.kind !== "string") {
      throw new Error(`Target ${name} needs package and kind`);
    }
    if (target.kind === "static" && (typeof target.slug !== "string" || typeof target.dist !== "string")) {
      throw new Error(`Static target ${name} needs slug and dist`);
    }
  }
  return targets;
}

export function normalizeAffected(value) {
  if (value == null) return [];
  const items = extractItems(value);
  return items
    .map((item) => {
      if (typeof item === "string") return { name: item, reason: "FileChanged" };
      const name = item?.package?.name ?? item?.name;
      if (!name || name === "//") return null;
      const reason = typename(item?.reason) ?? "FileChanged";
      return { name, reason };
    })
    .filter(Boolean);
}

function extractItems(value) {
  if (Array.isArray(value)) return value;
  const tasks = value?.data?.affectedTasks?.items ?? value?.affectedTasks?.items;
  if (Array.isArray(tasks)) return tasks;
  const packages = value?.data?.affectedPackages?.items ?? value?.affectedPackages?.items;
  if (Array.isArray(packages)) return packages;
  throw new Error("Unrecognised turbo affected JSON (expected affectedTasks or affectedPackages)");
}

function typename(reason) {
  if (reason == null) return null;
  if (typeof reason === "string") return reason;
  return reason.__typename ?? reason.typename ?? null;
}

export function classifyTurboReason(reason) {
  return DEPENDENCY_REASONS.has(reason) ? "dependent" : "affected";
}

export function isNonDeployPath(file) {
  const normalised = file.replace(/\\/g, "/").replace(/^\.\//, "");
  if (normalised.startsWith(".github/") || normalised === ".github") return true;
  if (normalised.startsWith("deploy/") || normalised === "deploy") return true;
  if (normalised.startsWith("specs/") || normalised === "specs") return true;
  if (normalised.startsWith("docs/") || normalised === "docs") return true;
  return normalised.endsWith(".md");
}

export function packageRoot(target) {
  if (typeof target.dist === "string") return target.dist.replace(/\/dist\/?$/, "");
  if (typeof target.root === "string") return target.root;
  const match = /^@([^/]+)\/(.+)$/.exec(target.package ?? "");
  if (!match) return null;
  const [, scope, name] = match;
  if (scope === "apps") return `apps/${name}`;
  if (scope === "services") return `services/${name}`;
  if (scope === "contracts" || scope === "repo") return `packages/${name}`;
  return null;
}

function fileUnder(file, root) {
  return file === root || file.startsWith(`${root}/`);
}

function isSchemaFile(file) {
  return (
    file.includes("/migrations/") ||
    file.endsWith("/openapi.json") ||
    file.endsWith(".schema.json") ||
    file.endsWith("/schema.json")
  );
}

export function branchName(ref) {
  if (!ref) return "";
  return ref.replace(/^refs\/heads\//, "");
}

export function resolveContext({ event, ref, baseRef }) {
  const branch = branchName(ref);
  if (event === "pull_request" || event === "pull_request_target") {
    if (baseRef !== "main") {
      return { env: null, preview: false, skip: "stacked-pr" };
    }
    return { env: "preview", preview: true, host: HOSTS.preview, skip: null };
  }
  if (event === "push" || event === "workflow_dispatch") {
    const env = REFS[branch];
    if (!env) return { env: null, preview: false, skip: "untracked-ref" };
    return { env, preview: false, host: HOSTS[env], skip: null };
  }
  return { env: null, preview: false, skip: "unsupported-event" };
}

export function pickSuccessfulSha(deployments) {
  for (const deployment of deployments) {
    if (deployment.state === "success") return deployment.sha;
  }
  return null;
}

/**
 * Newest-first deployment records for one environment.
 * A failure newer than the last success is ignored, so the next push
 * diffs from that success and retries the failed sha.
 */
export function resolvePushBase({ deployments = [], env, target, fallbackSha }) {
  const environment = `${env}/${target}`;
  const sha = pickSuccessfulSha(deployments.filter((item) => item.environment === environment));
  return sha ?? fallbackSha ?? null;
}

export async function githubLastSuccessfulSha({
  owner,
  repo,
  environment,
  token,
  fetchImpl = globalThis.fetch,
}) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "workspace-deploy-planner",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const deployments = [];
  for (let page = 1; page <= 5; page += 1) {
    const url =
      `https://api.github.com/repos/${owner}/${repo}/deployments` +
      `?environment=${encodeURIComponent(environment)}&per_page=20&page=${page}`;
    const response = await fetchImpl(url, { headers });
    if (!response.ok) {
      throw new Error(`GitHub deployments ${response.status} for ${environment}`);
    }
    const body = await response.json();
    deployments.push(...body);
    if (!Array.isArray(body) || body.length < 20) break;
  }
  for (const deployment of deployments) {
    if (!deployment.statuses_url) {
      if (deployment.state === "success") return deployment.sha;
      continue;
    }
    const statusResponse = await fetchImpl(deployment.statuses_url, { headers });
    if (!statusResponse.ok) {
      throw new Error(`GitHub deployment statuses ${statusResponse.status} for ${deployment.sha}`);
    }
    const statuses = await statusResponse.json();
    if (statuses[0]?.state === "success") return deployment.sha;
  }
  return null;
}

function assertPrNumber(value) {
  const prNumber = Number(value);
  if (!Number.isInteger(prNumber) || prNumber <= 0) {
    throw new Error(`Preview plan requires a positive integer prNumber, received ${value}`);
  }
  return prNumber;
}

function workerName(targetName, ctx, targets) {
  const named = targets?.[targetName]?.workerNames;
  if (named && typeof named === "object") {
    if (ctx.preview) {
      const prefix = typeof named.previewPrefix === "string" && named.previewPrefix
        ? named.previewPrefix
        : `${targetName}-pr-`;
      return `${prefix}${ctx.prNumber}`;
    }
    const namedEnv = named[ctx.env];
    if (typeof namedEnv === "string" && namedEnv) return namedEnv;
  }
  if (ctx.preview) return `${targetName}-pr-${ctx.prNumber}`;
  if (ctx.env === "production") return targetName;
  return `${targetName}-${ctx.env}`;
}

function databaseName(database, ctx) {
  if (!database) return null;
  if (ctx.preview) return `${database}-pr-${ctx.prNumber}`;
  if (ctx.env === "production") return `${database}-prod`;
  return `${database}-${ctx.env}`;
}

function devApiUrl(apiTarget, workersSubdomain, targets) {
  const named = targets?.[apiTarget]?.workerNames?.dev;
  const name = typeof named === "string" && named ? named : `${apiTarget}-dev`;
  return `https://${name}.${workersSubdomain}.workers.dev`;
}

function previewOrEnvApiUrl(apiTarget, ctx, targets) {
  return `https://${workerName(apiTarget, ctx, targets)}.${ctx.workersSubdomain}.workers.dev`;
}

function emptyReport(ctx, skip) {
  return {
    env: ctx.env,
    host: ctx.host ?? null,
    prNumber: ctx.prNumber ?? null,
    skip,
    test: [],
    build: [],
    deploy: [],
    matrix: { include: [] },
  };
}

function detectSchema(targets, affected, changedFiles) {
  const touchedContracts = new Set();
  const knownContracts = new Set(
    Object.values(targets)
      .map((target) => target.contract)
      .filter(Boolean),
  );
  for (const item of affected) {
    if (knownContracts.has(item.name)) touchedContracts.add(item.name);
  }
  const migrationApis = new Set();
  for (const file of changedFiles ?? []) {
    for (const [contract, root] of Object.entries(CONTRACT_ROOTS)) {
      if (knownContracts.has(contract) && fileUnder(file, root)) touchedContracts.add(contract);
    }
    if (!isSchemaFile(file)) continue;
    for (const [name, target] of Object.entries(targets)) {
      const root = packageRoot(target);
      if (root && fileUnder(file, root)) migrationApis.add(name);
    }
  }
  return { touchedContracts, migrationApis };
}

function inferDirectTargets(targets, changedFiles) {
  const found = new Map();
  for (const file of changedFiles ?? []) {
    if (isNonDeployPath(file)) continue;
    for (const [name, target] of Object.entries(targets)) {
      const root = packageRoot(target);
      if (root && fileUnder(file, root)) found.set(name, "affected");
    }
  }
  return found;
}

function addSelection(selected, name, reason, base) {
  if (!selected.has(name)) selected.set(name, { reason, base });
}

function selectPreviewTargets(targets, affected, changedFiles, base) {
  const selected = new Map();
  const byPackage = new Map(Object.entries(targets).map(([name, target]) => [target.package, name]));
  for (const item of affected) {
    const name = byPackage.get(item.name);
    if (name) addSelection(selected, name, classifyTurboReason(item.reason), base);
  }
  for (const [name, reason] of inferDirectTargets(targets, changedFiles)) {
    addSelection(selected, name, reason, base);
  }
  const schema = detectSchema(targets, affected, changedFiles);
  for (const [name, target] of Object.entries(targets)) {
    if (target.contract && schema.touchedContracts.has(target.contract)) {
      addSelection(selected, name, "dependent", base);
    }
  }
  for (const [apiName, api] of Object.entries(targets)) {
    if (api.kind !== "cf-worker" || !selected.has(apiName)) continue;
    // A contract-only change pulls the API in through the graph (`dependent`).
    // The paired UI follows the same way. An API the diff actually edits
    // auto-rebuilds its UI with reason `paired-api`.
    const uiReason = selected.get(apiName).reason === "dependent" ? "dependent" : "paired-api";
    for (const [uiName, ui] of Object.entries(targets)) {
      if (ui.api === apiName) addSelection(selected, uiName, uiReason, base);
    }
  }
  expandSharedDatabases(targets, selected, base);
  return { selected, schema };
}

function expandSharedDatabases(targets, selected, base) {
  const selectedWorkers = [...selected.keys()].filter((name) => targets[name]?.kind === "cf-worker");
  const databases = new Set(selectedWorkers.map((name) => targets[name].d1).filter(Boolean));
  for (const database of databases) {
    const peers = Object.entries(targets).filter(
      ([, target]) => target.kind === "cf-worker" && target.d1 === database,
    );
    if (peers.length < 2) continue;
    if (!peers.some(([name]) => selected.has(name))) continue;
    for (const [name] of peers) addSelection(selected, name, "shared-d1", base);
    const peerNames = new Set(peers.map(([name]) => name));
    for (const [uiName, ui] of Object.entries(targets)) {
      if (peerNames.has(ui.api)) addSelection(selected, uiName, "shared-d1", base);
    }
  }
}

function affectedForBase(input, base) {
  if (input.affectedByBase) return input.affectedByBase[base] ?? [];
  return input.affected ?? [];
}

function filesForBase(input, base) {
  if (input.changedFilesByBase) return input.changedFilesByBase[base] ?? [];
  return input.changedFiles ?? [];
}

function selectPushTargets(targets, input) {
  const selected = new Map();
  const schema = { touchedContracts: new Set(), migrationApis: new Set() };
  for (const name of Object.keys(targets)) {
    const base = input.bases?.[name] ?? input.fallbackBase ?? input.baseSha ?? null;
    const affected = normalizeAffected(affectedForBase(input, base));
    const changedFiles = filesForBase(input, base);
    const localSchema = detectSchema(targets, affected, changedFiles);
    for (const contract of localSchema.touchedContracts) schema.touchedContracts.add(contract);
    for (const api of localSchema.migrationApis) schema.migrationApis.add(api);
    const target = targets[name];
    const match = affected.find((item) => item.name === target.package);
    const fileHit = inferDirectTargets(targets, changedFiles).has(name);
    const contractHit = target.contract && localSchema.touchedContracts.has(target.contract);
    if (match) addSelection(selected, name, classifyTurboReason(match.reason), base);
    else if (fileHit) addSelection(selected, name, "affected", base);
    else if (contractHit) addSelection(selected, name, "dependent", base);
  }
  return { selected, schema };
}

function schemaFlags(name, target, targets, schema, ctx) {
  const contractHit = Boolean(target.contract && schema.touchedContracts.has(target.contract));
  const migrationHit = schema.migrationApis.has(name);
  let schemaChanged = contractHit || migrationHit;
  if (target.kind === "cf-worker" && target.d1) {
    const peerSchema = Object.entries(targets).some(([peerName, peer]) => {
      if (peer.kind !== "cf-worker" || peer.d1 !== target.d1) return false;
      return (
        schema.migrationApis.has(peerName) ||
        Boolean(peer.contract && schema.touchedContracts.has(peer.contract))
      );
    });
    if (peerSchema) schemaChanged = true;
  }
  if (target.api && targets[target.api]) {
    const api = targets[target.api];
    const peers = Object.entries(targets)
      .filter(([, peer]) => peer.kind === "cf-worker" && api.d1 && peer.d1 === api.d1)
      .map(([peerName]) => peerName);
    const group = peers.length > 0 ? peers : [target.api];
    const apiSchema = group.some((apiName) => {
      const peer = targets[apiName];
      return (
        schema.migrationApis.has(apiName) ||
        Boolean(peer.contract && schema.touchedContracts.has(peer.contract))
      );
    });
    if (apiSchema) schemaChanged = true;
  }
  return {
    schemaChanged,
    freshDb: Boolean(ctx.preview && target.kind === "cf-worker" && schemaChanged),
    contractCheck: schemaChanged,
  };
}

function materialize(targets, selected, schema, ctx) {
  const names = [...selected.keys()].sort((left, right) => {
    const kindOrder = (name) => (targets[name].kind === "cf-worker" ? 0 : 1);
    const byKind = kindOrder(left) - kindOrder(right);
    if (byKind !== 0) return byKind;
    return left.localeCompare(right);
  });
  return names.map((name) => {
    const target = targets[name];
    const meta = selected.get(name);
    const flags = schemaFlags(name, target, targets, schema, ctx);
    const apiSelected = target.api ? selected.has(target.api) : false;
    let apiBaseUrl = null;
    if (target.api) {
      if (ctx.preview && !apiSelected) apiBaseUrl = devApiUrl(target.api, ctx.workersSubdomain, targets);
      else apiBaseUrl = previewOrEnvApiUrl(target.api, ctx, targets);
    }
    const entry = {
      target: name,
      kind: target.kind,
      env: ctx.env,
      base: meta.base,
      path:
        target.kind === "static"
          ? ctx.preview
            ? `/preview/${target.slug}/pr-${ctx.prNumber}/`
            : `/${target.slug}/`
          : workerName(name, ctx, targets),
      apiBaseUrl,
      reason: meta.reason,
      host: target.kind === "static" ? ctx.host : `${workerName(name, ctx, targets)}.${ctx.workersSubdomain}.workers.dev`,
      d1: target.kind === "cf-worker" ? databaseName(target.d1, ctx) : null,
      freshDb: flags.freshDb,
      schemaChanged: flags.schemaChanged,
      contractCheck: flags.contractCheck,
    };
    for (const key of ENTRY_KEYS) {
      if (!(key in entry)) throw new Error(`Plan entry for ${name} is missing ${key}`);
    }
    return entry;
  });
}

function testPackages(targets, selected, affected) {
  const packages = new Set(affected.map((item) => item.name));
  for (const [name, meta] of selected) {
    if (meta.reason === "affected" || meta.reason === "dependent" || meta.reason === "force-all") {
      packages.add(targets[name].package);
    }
  }
  return [...packages].sort();
}

function buildPackages(targets, deploy) {
  const packages = [];
  for (const entry of deploy) {
    const packageName = targets[entry.target].package;
    if (!packages.includes(packageName)) packages.push(packageName);
  }
  return packages;
}

/**
 * @returns {{env: string|null, host: string|null, prNumber: number|null, skip: string|null, test: string[], build: string[], deploy: object[], matrix: {include: object[]}}}
 */
export function createReport(input) {
  const targets = input.targets ?? loadTargets();
  const ctx = resolveContext(input);
  const workersSubdomain = input.workersSubdomain ?? process.env.WORKERS_SUBDOMAIN ?? "acct";
  const labels = input.labels ?? [];
  const forceAll = Boolean(input.forceAll) || labels.includes("force-all");
  if (!ctx.env) {
    return emptyReport({ ...ctx, prNumber: null }, ctx.skip);
  }
  const planning = {
    ...ctx,
    prNumber: ctx.preview ? assertPrNumber(input.prNumber) : null,
    workersSubdomain,
  };
  const changedFiles = input.changedFiles ?? null;
  if (!forceAll && Array.isArray(changedFiles) && changedFiles.length > 0 && changedFiles.every(isNonDeployPath)) {
    return emptyReport(planning, "non-deploy-paths");
  }

  let selected;
  let schema;
  let affected = [];
  if (forceAll) {
    selected = new Map();
    for (const name of Object.keys(targets)) {
      const base = planning.preview
        ? (input.baseSha ?? null)
        : (input.bases?.[name] ?? input.fallbackBase ?? input.baseSha ?? null);
      selected.set(name, { reason: "force-all", base });
    }
    affected = Object.values(targets).map((target) => ({ name: target.package, reason: "FileChanged" }));
    schema = detectSchema(targets, [], changedFiles ?? []);
  } else if (planning.preview) {
    affected = normalizeAffected(input.affected ?? []);
    const preview = selectPreviewTargets(targets, affected, changedFiles ?? [], input.baseSha ?? null);
    selected = preview.selected;
    schema = preview.schema;
    if (selected.size === 0) return emptyReport(planning, "nothing-affected");
  } else {
    const push = selectPushTargets(targets, input);
    selected = push.selected;
    schema = push.schema;
    affected = [];
    const seenBases = new Set();
    for (const meta of selected.values()) {
      if (seenBases.has(meta.base)) continue;
      seenBases.add(meta.base);
      affected.push(...normalizeAffected(affectedForBase(input, meta.base)));
    }
    if (selected.size === 0) return emptyReport(planning, "nothing-affected");
  }

  const deploy = materialize(targets, selected, schema, planning);
  return {
    env: planning.env,
    host: planning.host,
    prNumber: planning.prNumber,
    skip: null,
    test: testPackages(targets, selected, affected),
    build: buildPackages(targets, deploy),
    deploy,
    matrix: toStrategyMatrix(deploy),
  };
}

export function createPlan(input) {
  return createReport(input).deploy;
}

export function toStrategyMatrix(deploy) {
  return { include: deploy };
}

function readJsonFlag(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

export function parseArgs(argv) {
  const args = {
    changedFiles: [],
    labels: [],
    bases: {},
    matrix: false,
    dryRun: false,
    forceAll: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`${token} requires a value`);
      return argv[index];
    };
    switch (token) {
      case "--event":
        args.event = next();
        break;
      case "--ref":
        args.ref = next();
        break;
      case "--base-ref":
        args.baseRef = next();
        break;
      case "--pr":
        args.prNumber = next();
        break;
      case "--sha":
        args.headSha = next();
        break;
      case "--base":
        args.baseSha = next();
        break;
      case "--fallback-base":
        args.fallbackBase = next();
        break;
      case "--base-for": {
        const raw = next();
        const eq = raw.indexOf("=");
        if (eq <= 0) throw new Error("--base-for expects target=sha");
        args.bases[raw.slice(0, eq)] = raw.slice(eq + 1);
        break;
      }
      case "--workers-subdomain":
        args.workersSubdomain = next();
        break;
      case "--label":
        args.labels.push(next());
        break;
      case "--force-all":
        args.forceAll = true;
        break;
      case "--changed-file":
        args.changedFiles.push(next());
        break;
      case "--affected-json":
        args.affectedJson = next();
        break;
      case "--affected-by-base-json":
        args.affectedByBaseJson = next();
        break;
      case "--out":
        args.out = next();
        break;
      case "--targets":
        args.targetsPath = next();
        break;
      case "--matrix":
        args.matrix = true;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      case "--help":
      case "-h":
        args.help = true;
        break;
      default:
        throw new Error(`Unknown argument ${token}`);
    }
  }
  return args;
}

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function queryTurboAffected(base, head, cwd) {
  const turboArgs = ["exec", "turbo", "query", "affected", "--tasks", "build", "--base", base];
  if (head) turboArgs.push("--head", head);
  try {
    const stdout = execFileSync("pnpm", turboArgs, { cwd, encoding: "utf8" });
    return JSON.parse(stdout);
  } catch (error) {
    const detail = error.stderr?.toString() || error.message;
    throw new Error(
      `turbo query affected failed (T05 pins Turborepo >= 2.9). ${detail}`,
    );
  }
}

function changedFilesBetween(base, head, cwd) {
  if (!base) return [];
  const range = head ? `${base}...${head}` : base;
  const stdout = git(["diff", "--name-only", range], cwd);
  return stdout ? stdout.split("\n").filter(Boolean) : [];
}

function applyGithubEnv(args) {
  if (!args.event) args.event = process.env.GITHUB_EVENT_NAME;
  if (!args.ref) args.ref = process.env.GITHUB_REF_NAME || process.env.GITHUB_REF;
  if (!args.baseRef) args.baseRef = process.env.GITHUB_BASE_REF;
  if (!args.headSha) args.headSha = process.env.GITHUB_SHA;
  if (!args.workersSubdomain && process.env.WORKERS_SUBDOMAIN) {
    args.workersSubdomain = process.env.WORKERS_SUBDOMAIN;
  }
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !existsSync(eventPath)) return;
  const payload = JSON.parse(readFileSync(eventPath, "utf8"));
  if (!args.prNumber) args.prNumber = payload.pull_request?.number ?? payload.number;
  const payloadLabels = payload.pull_request?.labels ?? payload.labels ?? [];
  for (const label of payloadLabels) {
    const name = typeof label === "string" ? label : label?.name;
    if (name && !args.labels.includes(name)) args.labels.push(name);
  }
  if (payload.inputs?.forceAll === "true" || payload.inputs?.forceAll === true) args.forceAll = true;
}

async function resolvePushBases(args, targets, cwd) {
  const ctx = resolveContext(args);
  const bases = { ...args.bases };
  const missing = Object.keys(targets).filter((name) => !bases[name]);
  if (missing.length === 0 || ctx.preview || !ctx.env) return bases;
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;
  if (!token || !repository) {
    const fallback = args.fallbackBase || git(["rev-parse", "HEAD~1"], cwd);
    for (const name of missing) bases[name] = fallback;
    return bases;
  }
  const [owner, repo] = repository.split("/");
  for (const name of missing) {
    const environment = `${ctx.env}/${name}`;
    const sha = await githubLastSuccessfulSha({ owner, repo, environment, token });
    bases[name] = sha || args.fallbackBase || git(["rev-parse", "HEAD~1"], cwd);
  }
  return bases;
}

export async function main(argv = process.argv.slice(2), io = {}) {
  const stdout = io.stdout ?? process.stdout;
  const stderr = io.stderr ?? process.stderr;
  const args = parseArgs(argv);
  if (args.help) {
    stdout.write(
      "Usage: node deploy/plan.mjs --event pull_request|push --ref <branch> [--base-ref main] [--pr N] [--dry-run] [--matrix]\n",
    );
    return 0;
  }
  applyGithubEnv(args);
  if (!args.event) {
    stderr.write("deploy/plan.mjs: --event or GITHUB_EVENT_NAME is required\n");
    return 1;
  }
  const cwd = io.cwd ?? process.cwd();
  const targets = loadTargets(args.targetsPath ?? DEFAULT_TARGETS);
  const ctx = resolveContext(args);
  const input = {
    targets,
    event: args.event,
    ref: args.ref,
    baseRef: args.baseRef,
    prNumber: args.prNumber,
    headSha: args.headSha,
    baseSha: args.baseSha,
    fallbackBase: args.fallbackBase,
    labels: args.labels,
    forceAll: args.forceAll,
    workersSubdomain: args.workersSubdomain,
    changedFiles: args.changedFiles.length > 0 ? args.changedFiles : undefined,
    bases: Object.keys(args.bases).length > 0 ? args.bases : undefined,
  };
  if (args.affectedJson) input.affected = readJsonFlag(args.affectedJson);
  if (args.affectedByBaseJson) input.affectedByBase = readJsonFlag(args.affectedByBaseJson);

  const suppliedAffected = Boolean(args.affectedJson || args.affectedByBaseJson);
  const suppliedFiles = args.changedFiles.length > 0;
  if (!args.forceAll && ctx.env && !suppliedAffected && !suppliedFiles) {
    if (ctx.preview) {
      const base = args.baseSha || git(["merge-base", "origin/main", args.headSha || "HEAD"], cwd);
      input.baseSha = base;
      input.changedFiles = changedFilesBetween(base, args.headSha || "HEAD", cwd);
      input.affected = queryTurboAffected(base, args.headSha || "HEAD", cwd);
    } else {
      input.bases = await resolvePushBases(args, targets, cwd);
      input.affectedByBase = {};
      input.changedFilesByBase = {};
      const uniqueBases = [...new Set(Object.values(input.bases))];
      for (const base of uniqueBases) {
        input.affectedByBase[base] = queryTurboAffected(base, args.headSha || "HEAD", cwd);
        input.changedFilesByBase[base] = changedFilesBetween(base, args.headSha || "HEAD", cwd);
      }
    }
  } else if (!ctx.preview && ctx.env && !input.bases && !args.forceAll) {
    input.bases = await resolvePushBases(args, targets, cwd);
  }

  const report = createReport(input);
  const payload = args.matrix && !args.dryRun ? report.matrix : args.dryRun ? report : report.deploy;
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  if (args.out || !args.dryRun) {
    const outFile = args.out ?? path.join(cwd, "plan.json");
    writeFileSync(outFile, `${JSON.stringify(report.deploy, null, 2)}\n`);
  }
  stdout.write(text);
  return 0;
}

function invokedAsCli() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(path.resolve(entry)).href;
}

if (invokedAsCli()) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(error.message);
      process.exitCode = 1;
    },
  );
}
