#!/usr/bin/env node
/**
 * Deploy and delete the yt-scheduler API Worker.
 *
 * Free plan only: the generated config has no limits.cpu_ms and no cron triggers.
 * Database ids in git are placeholders. This script creates the D1 database
 * (or reuses one with the same name) and writes a temporary Wrangler file.
 *
 *   node deploy/yt-worker.mjs deploy --env dev|staging|production|preview [--pr N]
 *   node deploy/yt-worker.mjs delete-preview --pr N
 */

import { spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const API_ROOT = path.join(HERE, "..", "apps", "yt-scheduler-api");
export const WORKERS_SUBDOMAIN = "coderdevelopment";
export const MOCK_ENCRYPTION_KEY = "BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwc=";
export const DEFAULT_CHUNK_BYTES = 64 * 1024 * 1024;
const ALIGN = 256 * 1024;
const MAX_CHUNK = 64 * 1024 * 1024;
const CF_API = "https://api.cloudflare.com/client/v4";

const SITES = {
  dev: "https://dev.yogeshkumarasamy.in",
  staging: "https://staging.yogeshkumarasamy.in",
  production: "https://yogeshkumarasamy.in",
};

export function assertPr(value) {
  const pr = Number(value);
  if (!Number.isInteger(pr) || pr <= 0) throw new Error(`PR number must be a positive integer, received ${value}`);
  return pr;
}

export function parseChunkBytes(raw) {
  if (raw == null || raw === "") return DEFAULT_CHUNK_BYTES;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < ALIGN) {
    throw new Error(`UPLOAD_CHUNK_BYTES must be an integer >= ${ALIGN}`);
  }
  if (value > MAX_CHUNK) {
    throw new Error("UPLOAD_CHUNK_BYTES must be <= 64 MiB so a chunk stays under the 100 MB request-body cap");
  }
  if (value % ALIGN !== 0) throw new Error("UPLOAD_CHUNK_BYTES must be a multiple of 256 KiB");
  return value;
}

export function namesFor(env, pr) {
  if (env === "preview") {
    const number = assertPr(pr);
    return {
      env,
      envName: "preview",
      pr: number,
      worker: `yt-scheduler-api-pr-${number}`,
      database: `yt-pr-${number}`,
      workflow: `yt-scheduler-upload-pr-${number}`,
      youtubeMode: "mock",
    };
  }
  const table = {
    dev: ["yt-scheduler-api-dev", "yt-dev", "yt-scheduler-upload-dev", "mock"],
    staging: ["yt-scheduler-api-staging", "yt-staging", "yt-scheduler-upload-staging", "mock"],
    production: ["yt-scheduler-api-prod", "yt-prod", "yt-scheduler-upload-prod", "live"],
  };
  const row = table[env];
  if (!row) throw new Error(`unknown yt-scheduler environment ${env}`);
  return { env, envName: env, pr: null, worker: row[0], database: row[1], workflow: row[2], youtubeMode: row[3] };
}

export function workerOrigin(worker, subdomain = WORKERS_SUBDOMAIN) {
  return `https://${worker}.${subdomain}.workers.dev`;
}

export function publicUrls(env, pr) {
  if (env === "preview") {
    const number = assertPr(pr);
    return {
      corsOrigin: SITES.dev,
      appPublicUrl: `${SITES.dev}/preview/yt-scheduler/pr-${number}/`,
      pageBase: `/preview/yt-scheduler/pr-${number}/`,
    };
  }
  const site = SITES[env];
  if (!site) throw new Error(`unknown yt-scheduler environment ${env}`);
  return { corsOrigin: site, appPublicUrl: `${site}/yt-scheduler/`, pageBase: "/yt-scheduler/" };
}

function embeddedApiKey(env, processEnv, pr) {
  if (env === "preview") return `preview-pr-${assertPr(pr)}`;
  return processEnv.YT_API_KEY || env;
}

export function resolveWorkerSecrets(env, processEnv, pr) {
  if (env === "production") {
    const required = ["YT_API_KEY", "YT_ENCRYPTION_KEY", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
    const missing = required.filter((name) => !processEnv[name]);
    if (missing.length) {
      throw new Error(
        `missing production secrets: ${missing.join(", ")}. Add them to the GitHub Environment named production.`,
      );
    }
    return {
      API_KEY: processEnv.YT_API_KEY,
      ENCRYPTION_KEY: processEnv.YT_ENCRYPTION_KEY,
      GOOGLE_CLIENT_ID: processEnv.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: processEnv.GOOGLE_CLIENT_SECRET,
    };
  }
  return {
    API_KEY: embeddedApiKey(env, processEnv, pr),
    ENCRYPTION_KEY: processEnv.YT_ENCRYPTION_KEY || MOCK_ENCRYPTION_KEY,
  };
}

/**
 * Public app-config.json. Production never embeds the Worker API key: the UI
 * asks for it at sign-in. Dev, staging, and preview still embed apiKey so
 * those pages can sign in on their own. This does not call
 * resolveWorkerSecrets — the static step does not have the Worker secrets.
 */
export function buildAppConfig({ env, pr, processEnv }) {
  const names = namesFor(env, pr);
  const config = {
    apiBaseUrl: workerOrigin(names.worker),
    youtubeMode: names.youtubeMode,
    driveScope: "file",
  };
  if (env === "production") {
    if (!processEnv.GOOGLE_CLIENT_ID) {
      throw new Error(
        "missing GOOGLE_CLIENT_ID. Production app-config writes the public client id and an optional GOOGLE_PICKER_API_KEY, and no Worker secrets.",
      );
    }
    config.googleClientId = processEnv.GOOGLE_CLIENT_ID;
    if (processEnv.GOOGLE_PICKER_API_KEY) config.pickerApiKey = processEnv.GOOGLE_PICKER_API_KEY;
    return config;
  }
  config.apiKey = embeddedApiKey(env, processEnv, pr);
  if (processEnv.GOOGLE_CLIENT_ID) config.googleClientId = processEnv.GOOGLE_CLIENT_ID;
  if (processEnv.GOOGLE_PICKER_API_KEY) config.pickerApiKey = processEnv.GOOGLE_PICKER_API_KEY;
  return config;
}

export function renderWrangler(input) {
  const config = {
    name: "yt-scheduler-api",
    main: "src/index.ts",
    compatibility_date: "2026-10-17",
    workers_dev: true,
    rules: [{ type: "Text", globs: ["**/*.sql"], fallthrough: true }],
    observability: { enabled: true },
    env: {
      [input.envName]: {
        name: input.worker,
        vars: {
          ENVIRONMENT: input.env,
          YOUTUBE_MODE: input.youtubeMode,
          DRIVE_SCOPE: "file",
          UPLOAD_CHUNK_BYTES: String(input.chunkBytes),
          CORS_ORIGIN: input.corsOrigin,
          APP_PUBLIC_URL: input.appPublicUrl,
          DAILY_QUOTA_UNITS: "10000",
          GOOGLE_REDIRECT_URI: `${workerOrigin(input.worker)}/oauth/callback`,
          GIT_SHA: input.gitSha || "unknown",
        },
        d1_databases: [
          {
            binding: "DB",
            database_name: input.database,
            database_id: input.databaseId,
            migrations_dir: "migrations",
          },
        ],
        workflows: [
          {
            name: input.workflow,
            binding: "UPLOAD",
            class_name: "UploadWorkflow",
          },
        ],
        triggers: { crons: [] },
      },
    },
  };
  if (JSON.stringify(config).includes("cpu_ms")) {
    throw new Error("generated wrangler config must not set limits.cpu_ms");
  }
  return config;
}

export function parseJsonOutput(stdout) {
  const text = String(stdout ?? "");
  const arrayAt = text.indexOf("[");
  const objectAt = text.indexOf("{");
  const start = arrayAt === -1 ? objectAt : objectAt === -1 ? arrayAt : Math.min(arrayAt, objectAt);
  if (start < 0) throw new Error("wrangler did not return JSON");
  return JSON.parse(text.slice(start));
}

export function findDatabaseId(listJson, name) {
  const rows = Array.isArray(listJson) ? listJson : listJson?.result ?? [];
  const match = rows.find((row) => row?.name === name || row?.database_name === name);
  return match?.uuid ?? match?.database_id ?? null;
}

export function parseCreatedDatabaseId(stdout) {
  const text = String(stdout ?? "");
  try {
    const parsed = parseJsonOutput(text);
    const id = parsed.uuid ?? parsed.database_id ?? parsed?.d1_databases?.[0]?.database_id;
    if (typeof id === "string") return id;
  } catch {
    /* Wrangler 4.151 prints a config snippet after a few log lines, or TOML. */
  }
  const match = /database_id\s*=\s*"([0-9a-f-]{36})"/i.exec(text)
    ?? /"database_id"\s*:\s*"([0-9a-f-]{36})"/i.exec(text)
    ?? /"uuid"\s*:\s*"([0-9a-f-]{36})"/i.exec(text);
  return match?.[1] ?? null;
}

function defaultExec(args, { input } = {}) {
  const result = spawnSync("pnpm", ["exec", "wrangler", ...args], {
    cwd: API_ROOT,
    input,
    encoding: "utf8",
    env: process.env,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || `wrangler ${args.join(" ")} failed`).trim());
  }
  return result.stdout ?? "";
}

function secretNames(env) {
  const names = ["API_KEY", "ENCRYPTION_KEY"];
  if (env === "production") names.push("GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET");
  return names;
}

export async function deployWorker({
  env,
  pr,
  processEnv = process.env,
  exec = defaultExec,
  configDir = API_ROOT,
} = {}) {
  const names = namesFor(env, pr);
  const secrets = resolveWorkerSecrets(env, processEnv, names.pr);
  const urls = publicUrls(env, names.pr);
  const chunkBytes = parseChunkBytes(processEnv.UPLOAD_CHUNK_BYTES);
  const listed = exec(["d1", "list", "--json"]);
  let databaseId = findDatabaseId(parseJsonOutput(listed), names.database);
  if (!databaseId) {
    databaseId = parseCreatedDatabaseId(exec(["d1", "create", names.database]));
  }
  if (!databaseId) throw new Error(`could not resolve D1 database id for ${names.database}`);
  const config = renderWrangler({
    ...names,
    ...urls,
    databaseId,
    chunkBytes,
    gitSha: processEnv.GITHUB_SHA || processEnv.GIT_SHA || "unknown",
  });
  // Paths in a Wrangler config are relative to the config file. Keep this file
  // in the package root so `src/index.ts` and `migrations/` resolve.
  const configPath = path.join(configDir, "wrangler.deploy.json");
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  try {
    exec(["d1", "migrations", "apply", names.database, "--remote", "--config", configPath, "--env", names.envName]);
    for (const name of secretNames(env)) {
      exec(["secret", "put", name, "--config", configPath, "--env", names.envName], { input: `${secrets[name]}\n` });
    }
    exec(["deploy", "--config", configPath, "--env", names.envName]);
  } finally {
    rmSync(configPath, { force: true });
  }
  return { worker: names.worker, database: names.database, workflow: names.workflow, url: workerOrigin(names.worker) };
}

async function deleteOk(url, headers, fetchImpl) {
  const response = await fetchImpl(url, { method: "DELETE", headers });
  if (response.ok || response.status === 404) return { url, status: response.status, ok: true };
  const text = await response.text();
  throw new Error(`DELETE ${url} -> ${response.status} ${text}`);
}

export async function deletePreview({ accountId, apiToken, pr, fetchImpl = globalThis.fetch }) {
  if (!accountId || !apiToken) throw new Error("CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required");
  const names = namesFor("preview", pr);
  const headers = { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" };
  const results = [];
  results.push(await deleteOk(`${CF_API}/accounts/${accountId}/workers/scripts/${names.worker}`, headers, fetchImpl));
  const listed = await fetchImpl(`${CF_API}/accounts/${accountId}/d1/database?name=${encodeURIComponent(names.database)}`, { headers });
  if (listed.status === 404) {
    results.push({ resource: "d1", status: 404, ok: true });
  } else if (!listed.ok) {
    throw new Error(`D1 list -> ${listed.status}`);
  } else {
    const body = await listed.json();
    const rows = body.result ?? [];
    const match = rows.find((row) => row.name === names.database);
    if (!match) results.push({ resource: "d1", status: 404, ok: true });
    else results.push(await deleteOk(`${CF_API}/accounts/${accountId}/d1/database/${match.uuid}`, headers, fetchImpl));
  }
  results.push(await deleteOk(`${CF_API}/accounts/${accountId}/workflows/${names.workflow}`, headers, fetchImpl));
  return { names, results };
}

function argValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
}

async function main(argv) {
  const command = argv[0];
  const env = argValue(argv, "--env");
  const pr = argValue(argv, "--pr") ?? process.env.PR_NUMBER;
  if (command === "deploy") {
    const deployed = await deployWorker({ env, pr, processEnv: process.env });
    console.log(`deployed ${deployed.url}`);
    return;
  }
  if (command === "delete-preview") {
    const deleted = await deletePreview({
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: process.env.CLOUDFLARE_API_TOKEN,
      pr,
    });
    console.log(`deleted preview resources for pr-${deleted.names.pr}`);
    return;
  }
  if (command === "print-app-config") {
    process.stdout.write(`${JSON.stringify(buildAppConfig({ env, pr, processEnv: process.env }))}\n`);
    return;
  }
  throw new Error("usage: yt-worker.mjs deploy|delete-preview|print-app-config --env <env> [--pr N]");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
