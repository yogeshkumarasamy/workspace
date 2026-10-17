/**
 * Checks Innings Break Wrangler scaffolding against specs/innings-break/runtime.md.
 * Does not call Cloudflare and does not deploy.
 *
 * Run: pnpm check:ib-wrangler
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENVS = ["dev", "staging", "production", "preview"];
const PERMANENT = ["dev", "staging", "production"];
const SHARED_D1 = {
  dev: {
    database_name: "ib-dev",
    database_id: "REPLACE_WITH_ib-dev_DATABASE_ID",
  },
  staging: {
    database_name: "ib-staging",
    database_id: "REPLACE_WITH_ib-staging_DATABASE_ID",
  },
  production: {
    database_name: "ib-prod",
    database_id: "REPLACE_WITH_ib-prod_DATABASE_ID",
  },
};
const PREVIEW_D1 = {
  database_name: "ib-pr-UNSET",
  database_id: "REPLACE_WITH_ib-pr-N_DATABASE_ID",
};
const CORS = {
  dev: "https://dev.yogeshkumarasamy.in",
  staging: "https://staging.yogeshkumarasamy.in",
  production: "https://yogeshkumarasamy.in",
  preview: "https://dev.yogeshkumarasamy.in",
};
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const failures = [];

function fail(message) {
  failures.push(message);
}

function parseJsonc(text, label) {
  let out = "";
  let i = 0;
  let inString = false;
  let escape = false;
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];
    if (inString) {
      out += c;
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      i += 1;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      i += 1;
      continue;
    }
    if (c === "/" && next === "/") {
      i += 2;
      while (i < text.length && text[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && next === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) {
        i += 1;
      }
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  try {
    return JSON.parse(out);
  } catch (error) {
    fail(`${label} is not valid JSONC: ${error.message}`);
    return null;
  }
}

function readConfig(relativePath) {
  const absolute = join(root, relativePath);
  const text = readFileSync(absolute, "utf8");
  if (/"[A-Za-z0-9_-]*TOKEN"|api[_-]?key|secret|cfat_/i.test(text)) {
    fail(`${relativePath} looks like it contains a credential`);
  }
  return parseJsonc(text, relativePath);
}

function sameStringArray(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function assertNoMigrations(config, label) {
  const stack = [config];
  while (stack.length) {
    const node = stack.pop();
    if (!node || typeof node !== "object") continue;
    if (Object.prototype.hasOwnProperty.call(node, "migrations_dir")) {
      fail(`${label} sets migrations_dir; migrations are applied once, elsewhere`);
    }
    if (Array.isArray(node)) stack.push(...node);
    else stack.push(...Object.values(node));
  }
}

function assertEnvKeys(config, label) {
  const keys = Object.keys(config.env ?? {}).sort();
  const expected = [...ENVS].sort();
  if (!sameStringArray(keys, expected)) {
    fail(`${label} env keys are ${keys.join(", ") || "(none)"}; expected ${expected.join(", ")}`);
  }
}

function assertNoTopLevelTriggersOrD1(config, label) {
  if (config.triggers) fail(`${label} has top-level triggers; crons would inherit into every env`);
  if (config.d1_databases) {
    fail(`${label} has top-level d1_databases; a bare wrangler deploy must not bind a database`);
  }
  if (config.services) fail(`${label} has top-level service bindings`);
}

function databaseIdShape(id, expectedPlaceholder) {
  if (id === expectedPlaceholder) return;
  if (!UUID.test(id)) {
    fail(
      `database_id ${JSON.stringify(id)} is neither ${expectedPlaceholder} nor a UUID`,
    );
  }
}

function assertSharedApi(config, workerPrefix) {
  const label = workerPrefix;
  if (config.name !== workerPrefix) fail(`${label} top-level name is ${config.name}`);
  if (config.main !== "src/index.js") fail(`${label} main is ${config.main}`);
  if (config.compatibility_date !== "2026-10-17") {
    fail(`${label} compatibility_date is ${config.compatibility_date}`);
  }
  if (config.workers_dev !== true) fail(`${label} workers_dev must be true`);
  const flags = config.compatibility_flags ?? [];
  if (flags.includes("nodejs_compat")) {
    fail(`${label} enables nodejs_compat; sessions use WebCrypto`);
  }
  assertEnvKeys(config, label);
  assertNoTopLevelTriggersOrD1(config, label);
  assertNoMigrations(config, label);

  for (const envName of ENVS) {
    const block = config.env[envName];
    const suffix = envName === "production" ? "prod" : envName;
    const expectedName = `${workerPrefix}-${suffix}`;
    if (block.name !== expectedName) {
      fail(`${label} env.${envName}.name is ${block.name}; expected ${expectedName}`);
    }
    if (!sameStringArray(block.triggers?.crons, [])) {
      fail(`${label} env.${envName} must set triggers.crons to []`);
    }
    if (block.services) fail(`${label} env.${envName} must not have service bindings`);
    const databases = block.d1_databases ?? [];
    if (databases.length !== 1) {
      fail(`${label} env.${envName} must bind exactly one D1 database`);
      continue;
    }
    const database = databases[0];
    if (database.binding !== "DB") {
      fail(`${label} env.${envName} binding is ${database.binding}; expected DB`);
    }
    if (database.migrations_dir || database.preview_database_id) {
      fail(`${label} env.${envName} must not set migrations_dir or preview_database_id`);
    }
    const expected = envName === "preview" ? PREVIEW_D1 : SHARED_D1[envName];
    if (database.database_name !== expected.database_name) {
      fail(
        `${label} env.${envName} database_name is ${database.database_name}; expected ${expected.database_name}`,
      );
    }
    databaseIdShape(database.database_id, expected.database_id);
    if (block.vars?.ENVIRONMENT !== envName) {
      fail(`${label} env.${envName} ENVIRONMENT var is ${block.vars?.ENVIRONMENT}`);
    }
    if (block.vars?.CORS_ORIGIN !== CORS[envName]) {
      fail(`${label} env.${envName} CORS_ORIGIN is ${block.vars?.CORS_ORIGIN}`);
    }
  }
}

function assertSameDatabase(left, right, envName) {
  const a = left.env[envName].d1_databases[0];
  const b = right.env[envName].d1_databases[0];
  if (a.database_name !== b.database_name || a.database_id !== b.database_id) {
    fail(
      `console and customer env.${envName} do not bind the same D1 (${a.database_name}/${a.database_id} vs ${b.database_name}/${b.database_id})`,
    );
  }
}

function assertCronHub(config, consoleApi) {
  if (config.name !== "cron-hub") fail(`cron-hub top-level name is ${config.name}`);
  if (config.main !== "src/index.js") fail("cron-hub main is not src/index.js");
  if (config.compatibility_date !== "2026-10-17") {
    fail(`cron-hub compatibility_date is ${config.compatibility_date}`);
  }
  if (config.workers_dev !== true) fail("cron-hub workers_dev must be true");
  assertEnvKeys(config, "cron-hub");
  assertNoTopLevelTriggersOrD1(config, "cron-hub");
  assertNoMigrations(config, "cron-hub");
  if (config.d1_databases || JSON.stringify(config).includes("d1_databases")) {
    fail("cron-hub must not bind D1");
  }

  for (const envName of ENVS) {
    const block = config.env[envName];
    const suffix = envName === "production" ? "prod" : envName;
    if (block.name !== `cron-hub-${suffix}`) {
      fail(`cron-hub env.${envName}.name is ${block.name}`);
    }
    if (block.d1_databases) fail(`cron-hub env.${envName} must not bind D1`);
    if (block.vars?.ENVIRONMENT !== envName) {
      fail(`cron-hub env.${envName} ENVIRONMENT var is ${block.vars?.ENVIRONMENT}`);
    }
    const services = block.services ?? [];
    if (services.length !== 1) {
      fail(`cron-hub env.${envName} must have exactly one service binding`);
    } else {
      const binding = services[0];
      if (binding.binding !== "IB_CONSOLE_API") {
        fail(`cron-hub env.${envName} binding name is ${binding.binding}`);
      }
      const expectedService = consoleApi.env[envName].name;
      if (binding.service !== expectedService) {
        fail(
          `cron-hub env.${envName} service is ${binding.service}; expected ${expectedService}`,
        );
      }
    }
    const crons = block.triggers?.crons;
    if (envName === "preview") {
      if (!sameStringArray(crons, [])) {
        fail("cron-hub preview must set triggers.crons to []");
      }
    } else if (!sameStringArray(crons, ["* * * * *"])) {
      fail(`cron-hub env.${envName} crons are ${JSON.stringify(crons)}; expected ["* * * * *"]`);
    }
  }
}

function walkWranglerFiles(dir, found = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".git" || entry === "dist") continue;
    const absolute = join(dir, entry);
    const stat = statSync(absolute);
    if (stat.isDirectory()) walkWranglerFiles(absolute, found);
    else if (entry.startsWith("wrangler.") && /\.(jsonc|json|toml)$/.test(entry)) {
      found.push(absolute);
    }
  }
  return found;
}

function countAccountCrons(files) {
  let count = 0;
  for (const file of files) {
    if (file.endsWith(".toml")) {
      fail(`Unexpected wrangler toml at ${file}; this repo uses jsonc`);
      continue;
    }
    const config = parseJsonc(readFileSync(file, "utf8"), file);
    if (!config) continue;
    const top = config.triggers?.crons ?? [];
    count += top.length;
    for (const block of Object.values(config.env ?? {})) {
      count += (block.triggers?.crons ?? []).length;
    }
  }
  return count;
}

const consoleApi = readConfig("apps/innings-break-console-api/wrangler.jsonc");
const customerApi = readConfig("apps/innings-break-customer-api/wrangler.jsonc");
const cronHub = readConfig("apps/cron-hub/wrangler.jsonc");

if (consoleApi && customerApi && cronHub) {
  assertSharedApi(consoleApi, "ib-console-api");
  assertSharedApi(customerApi, "ib-customer-api");
  for (const envName of [...PERMANENT, "preview"]) {
    assertSameDatabase(consoleApi, customerApi, envName);
  }
  const permanentIds = PERMANENT.map(
    (envName) => consoleApi.env[envName].d1_databases[0].database_id,
  );
  const previewId = consoleApi.env.preview.d1_databases[0].database_id;
  if (permanentIds.includes(previewId)) {
    fail("preview database_id matches a permanent environment database");
  }
  if (new Set(permanentIds).size !== permanentIds.length) {
    fail("dev, staging, and production must not share one database_id");
  }
  assertCronHub(cronHub, consoleApi);

  const files = walkWranglerFiles(root);
  const cronCount = countAccountCrons(files);
  if (cronCount !== 3) {
    fail(`account cron trigger count is ${cronCount}; expected 3 (cap is 5)`);
  }
  if (cronCount > 5) fail("account cron triggers exceed the Workers Free cap of 5");
}

if (failures.length) {
  console.error("check:ib-wrangler failed:");
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log("check:ib-wrangler ok");
console.log("- both API Workers bind the same D1 name and id in each environment");
console.log("- cron triggers: 3 (cron-hub dev, staging, production), under the cap of 5");
console.log("- preview crons are [] on the cron hub and on both APIs");
console.log("- database ids are still placeholders; wrangler deploy is not ready");
