import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { resolveRequest } from "./htaccess-sim.mjs";
import { spaHtaccess, writeStaticConfig } from "./yt-static.mjs";
import {
  MOCK_ENCRYPTION_KEY,
  buildAppConfig,
  deletePreview,
  deployWorker,
  findDatabaseId,
  namesFor,
  parseChunkBytes,
  parseCreatedDatabaseId,
  publicUrls,
  renderWrangler,
  resolveWorkerSecrets,
  workerOrigin,
} from "./yt-worker.mjs";

test("names follow the workers.dev layout, including the production -prod suffix", () => {
  assert.equal(namesFor("dev").worker, "yt-scheduler-api-dev");
  assert.equal(namesFor("staging").database, "yt-staging");
  assert.equal(namesFor("production").worker, "yt-scheduler-api-prod");
  assert.equal(namesFor("production").youtubeMode, "live");
  assert.equal(namesFor("preview", 12).worker, "yt-scheduler-api-pr-12");
  assert.equal(namesFor("preview", 12).database, "yt-pr-12");
  assert.equal(namesFor("preview", 12).workflow, "yt-scheduler-upload-pr-12");
  assert.equal(workerOrigin("yt-scheduler-api-prod"), "https://yt-scheduler-api-prod.coderdevelopment.workers.dev");
});

test("preview api key is preview-pr-N and production refuses to deploy without its secrets", () => {
  assert.equal(resolveWorkerSecrets("preview", {}, 9).API_KEY, "preview-pr-9");
  assert.equal(resolveWorkerSecrets("dev", {}, null).API_KEY, "dev");
  assert.equal(resolveWorkerSecrets("staging", { YT_API_KEY: "custom" }, null).API_KEY, "custom");
  assert.equal(resolveWorkerSecrets("dev", {}, null).ENCRYPTION_KEY, MOCK_ENCRYPTION_KEY);
  assert.throws(
    () => resolveWorkerSecrets("production", { YT_API_KEY: "only-one" }, null),
    /YT_ENCRYPTION_KEY, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET/,
  );
});

test("app-config points at the matching worker and never includes the client secret", () => {
  const preview = buildAppConfig({
    env: "preview",
    pr: 9,
    processEnv: { GOOGLE_CLIENT_SECRET: "super-secret", GOOGLE_CLIENT_ID: "123-abc.apps.googleusercontent.com" },
  });
  assert.equal(preview.apiBaseUrl, "https://yt-scheduler-api-pr-9.coderdevelopment.workers.dev");
  assert.equal(preview.apiKey, "preview-pr-9");
  assert.equal(preview.youtubeMode, "mock");
  assert.equal(preview.googleClientId, "123-abc.apps.googleusercontent.com");
  assert.equal("GOOGLE_CLIENT_SECRET" in preview, false);
  assert.equal(preview.clientSecret, undefined);

  const production = buildAppConfig({
    env: "production",
    processEnv: {
      YT_API_KEY: "prod-key",
      YT_ENCRYPTION_KEY: MOCK_ENCRYPTION_KEY,
      GOOGLE_CLIENT_ID: "123-abc.apps.googleusercontent.com",
      GOOGLE_CLIENT_SECRET: "super-secret",
      GOOGLE_PICKER_API_KEY: "picker-key",
    },
  });
  assert.equal(production.youtubeMode, "live");
  assert.equal(production.apiKey, undefined);
  assert.equal(production.pickerApiKey, "picker-key");
  assert.equal(JSON.stringify(production).includes("super-secret"), false);
  assert.equal(JSON.stringify(production).includes("prod-key"), false);
});

test("generated wrangler config has the real database id, empty crons, and no cpu cap", () => {
  const config = renderWrangler({
    env: "preview",
    envName: "preview",
    worker: "yt-scheduler-api-pr-3",
    database: "yt-pr-3",
    databaseId: "11111111-1111-4111-8111-111111111111",
    workflow: "yt-scheduler-upload-pr-3",
    youtubeMode: "mock",
    corsOrigin: "https://dev.yogeshkumarasamy.in",
    appPublicUrl: "https://dev.yogeshkumarasamy.in/preview/yt-scheduler/pr-3/",
    chunkBytes: 32 * 1024 * 1024,
    gitSha: "abc",
  });
  const text = JSON.stringify(config);
  assert.equal(text.includes("cpu_ms"), false);
  assert.equal(config.triggers, undefined);
  assert.equal(config.d1_databases, undefined);
  assert.deepEqual(config.env.preview.triggers.crons, []);
  assert.equal(config.env.preview.d1_databases[0].database_id, "11111111-1111-4111-8111-111111111111");
  assert.equal(config.env.preview.vars.UPLOAD_CHUNK_BYTES, String(32 * 1024 * 1024));
  assert.equal(config.env.preview.vars.YOUTUBE_MODE, "mock");
  assert.equal(config.env.preview.workflows[0].name, "yt-scheduler-upload-pr-3");
  assert.equal(config.rules[0].type, "Text");
  assert.deepEqual(config.rules[0].globs, ["**/*.sql"]);
  assert.throws(() => parseChunkBytes(1000), /262144/);
  assert.throws(() => parseChunkBytes(256 * 1024 + 1), /256 KiB/);
  assert.throws(() => parseChunkBytes(128 * 1024 * 1024), /64 MiB/);
});

test("database id parsers accept wrangler list and create output", () => {
  assert.equal(findDatabaseId([{ name: "yt-dev", uuid: "abc" }], "yt-dev"), "abc");
  assert.equal(findDatabaseId([{ name: "other", uuid: "nope" }], "yt-dev"), null);
  const toml = '[[d1_databases]]\nbinding = "DB"\ndatabase_name = "yt-dev"\ndatabase_id = "22222222-2222-4222-8222-222222222222"\n';
  assert.equal(parseCreatedDatabaseId(toml), "22222222-2222-4222-8222-222222222222");
  assert.equal(parseCreatedDatabaseId(JSON.stringify({ uuid: "33333333-3333-4333-8333-333333333333" })), "33333333-3333-4333-8333-333333333333");
  const snippet = `✅ Successfully created DB 'yt-pr-121'\n\n{\n  "d1_databases": [\n    {\n      "binding": "DB",\n      "database_name": "yt-pr-121",\n      "database_id": "55555555-5555-4555-8555-555555555555"\n    }\n  ]\n}\n`;
  assert.equal(parseCreatedDatabaseId(snippet), "55555555-5555-4555-8555-555555555555");
});

test("deploy creates a missing database, applies migrations, and puts secrets without printing them", async () => {
  const calls = [];
  const exec = (args, options = {}) => {
    calls.push({ args, input: options.input });
    if (args[0] === "d1" && args[1] === "list") return "[]";
    if (args[0] === "d1" && args[1] === "create") {
      return JSON.stringify({ uuid: "44444444-4444-4444-8444-444444444444" });
    }
    return "";
  };
  const dir = mkdtempSync(path.join(tmpdir(), "yt-deploy-"));
  try {
    const result = await deployWorker({
      env: "dev",
      processEnv: { GITHUB_SHA: "sha-1" },
      exec,
      configDir: dir,
    });
    assert.equal(result.worker, "yt-scheduler-api-dev");
    assert.equal(calls[0].args.slice(0, 3).join(" "), "d1 list --json");
    assert.equal(calls[1].args[1], "create");
    assert.equal(calls[1].args.includes("--json"), false);
    assert.equal(calls[2].args[1], "migrations");
    assert.deepEqual(calls[2].args.slice(-2), ["--env", "dev"]);
    assert.deepEqual(
      calls.filter((call) => call.args[0] === "secret").map((call) => call.args[2]),
      ["API_KEY", "ENCRYPTION_KEY"],
    );
    assert.equal(calls.some((call) => String(call.input).includes(MOCK_ENCRYPTION_KEY)), true);
    assert.equal(calls.at(-1).args[0], "deploy");
    assert.equal(JSON.stringify(calls).includes("cpu_ms"), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("delete-preview treats 404 as success and removes the worker, D1, and workflow", async () => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, method: init.method });
    if (String(url).includes("/d1/database?")) {
      return { ok: true, status: 200, json: async () => ({ result: [{ name: "yt-pr-4", uuid: "db-4" }] }) };
    }
    return { ok: false, status: 404, text: async () => "missing" };
  };
  const deleted = await deletePreview({ accountId: "acct", apiToken: "token", pr: 4, fetchImpl });
  assert.equal(deleted.results.every((item) => item.ok), true);
  assert.equal(calls[0].url.endsWith("/workers/scripts/yt-scheduler-api-pr-4"), true);
  assert.equal(calls[0].method, "DELETE");
  assert.equal(calls.some((call) => call.url.endsWith("/d1/database/db-4") && call.method === "DELETE"), true);
  assert.equal(calls.some((call) => call.url.endsWith("/workflows/yt-scheduler-upload-pr-4")), true);
});

test("preview public path matches the served /preview/ prefix", () => {
  const urls = publicUrls("preview", 121);
  assert.equal(urls.pageBase, "/preview/yt-scheduler/pr-121/");
  assert.equal(urls.appPublicUrl, "https://dev.yogeshkumarasamy.in/preview/yt-scheduler/pr-121/");
  assert.equal(publicUrls("dev").pageBase, "/yt-scheduler/");
});

test("production static config needs only the public client id and optional picker key", () => {
  assert.throws(
    () => buildAppConfig({ env: "production", processEnv: { GOOGLE_PICKER_API_KEY: "picker-only" } }),
    (error) => {
      assert.match(error.message, /GOOGLE_CLIENT_ID/);
      assert.equal(/YT_API_KEY|YT_ENCRYPTION_KEY|GOOGLE_CLIENT_SECRET/.test(error.message), false);
      return true;
    },
  );

  const dir = mkdtempSync(path.join(tmpdir(), "yt-dist-public-"));
  try {
    const written = writeStaticConfig({
      dist: dir,
      env: "production",
      processEnv: {
        GOOGLE_CLIENT_ID: "123-abc.apps.googleusercontent.com",
        GOOGLE_PICKER_API_KEY: "picker-key",
      },
    });
    const raw = readFileSync(path.join(dir, "app-config.json"), "utf8");
    const file = JSON.parse(raw);
    assert.equal(file.googleClientId, "123-abc.apps.googleusercontent.com");
    assert.equal(file.pickerApiKey, "picker-key");
    assert.equal(file.youtubeMode, "live");
    assert.equal(file.apiBaseUrl, written.config.apiBaseUrl);
    assert.match(file.apiBaseUrl, /yt-scheduler-api-prod/);
    assert.equal(file.apiKey, undefined);
    assert.equal(file.driveScope, "file");
    for (const marker of ["apiKey", "YT_API_KEY", "YT_ENCRYPTION_KEY", "GOOGLE_CLIENT_SECRET"]) {
      assert.equal(raw.includes(marker), false, marker);
    }

    writeStaticConfig({
      dist: dir,
      env: "production",
      processEnv: {
        GOOGLE_CLIENT_ID: "123-abc.apps.googleusercontent.com",
        YT_API_KEY: "prod-key",
        YT_ENCRYPTION_KEY: MOCK_ENCRYPTION_KEY,
        GOOGLE_CLIENT_SECRET: "super-secret",
      },
    });
    const ignored = readFileSync(path.join(dir, "app-config.json"), "utf8");
    const ignoredFile = JSON.parse(ignored);
    assert.equal(ignoredFile.pickerApiKey, undefined);
    assert.equal(ignoredFile.apiKey, undefined);
    for (const marker of ["prod-key", "super-secret", MOCK_ENCRYPTION_KEY, "apiKey"]) {
      assert.equal(ignored.includes(marker), false, marker);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("dev, staging, and preview static config still embed apiKey without production secrets", () => {
  for (const env of ["dev", "staging"]) {
    const dir = mkdtempSync(path.join(tmpdir(), `yt-dist-${env}-`));
    try {
      const written = writeStaticConfig({
        dist: dir,
        env,
        processEnv: { YT_API_KEY: `${env}-key` },
      });
      const file = JSON.parse(readFileSync(path.join(dir, "app-config.json"), "utf8"));
      assert.equal(file.apiKey, `${env}-key`);
      assert.equal(file.youtubeMode, "mock");
      assert.equal(file.apiBaseUrl, written.config.apiBaseUrl);
      assert.match(file.apiBaseUrl, new RegExp(`yt-scheduler-api-${env}`));
      assert.equal(file.googleClientId, undefined);
      const fallback = buildAppConfig({ env, processEnv: {} });
      assert.equal(fallback.apiKey, env);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  const previewDir = mkdtempSync(path.join(tmpdir(), "yt-dist-preview-"));
  try {
    const written = writeStaticConfig({
      dist: previewDir,
      env: "preview",
      pr: 4,
      processEnv: {},
    });
    assert.equal(written.config.apiKey, "preview-pr-4");
    assert.match(written.config.apiBaseUrl, /yt-scheduler-api-pr-4/);
    assert.equal(written.pageBase, "/preview/yt-scheduler/pr-4/");
  } finally {
    rmSync(previewDir, { recursive: true, force: true });
  }
});

test("flat htaccess rewrites the preview base and app-config stays out of production secrets", () => {
  const preview = spaHtaccess("/preview/yt-scheduler/pr-8/");
  assert.match(preview, /RewriteBase \/preview\/yt-scheduler\/pr-8\//);
  assert.match(preview, /RewriteRule \^ index\.html/);
  assert.equal(preview.includes("releases/"), false);
  const dir = mkdtempSync(path.join(tmpdir(), "yt-dist-"));
  try {
    const written = writeStaticConfig({
      dist: dir,
      env: "production",
      processEnv: {
        YT_API_KEY: "prod-key",
        YT_ENCRYPTION_KEY: MOCK_ENCRYPTION_KEY,
        GOOGLE_CLIENT_ID: "id",
        GOOGLE_CLIENT_SECRET: "super-secret",
      },
    });
    const file = JSON.parse(readFileSync(path.join(dir, "app-config.json"), "utf8"));
    assert.equal(file.apiBaseUrl, written.config.apiBaseUrl);
    assert.equal(file.apiKey, undefined);
    assert.equal(readFileSync(path.join(dir, ".htaccess"), "utf8").includes("RewriteBase /yt-scheduler/"), true);
    assert.equal(readFileSync(path.join(dir, "app-config.json"), "utf8").includes("super-secret"), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("privacy and terms are served as HTML with or without a trailing slash", () => {
  const base = "/preview/yt-scheduler/pr-8/";
  const preview = spaHtaccess(base);
  const privacyAt = preview.indexOf("RewriteRule ^privacy/?$ privacy/index.html [L]");
  const termsAt = preview.indexOf("RewriteRule ^terms/?$ terms/index.html [L]");
  const passAt = preview.indexOf("RewriteCond %{REQUEST_FILENAME} -f [OR]");
  const spaAt = preview.indexOf("RewriteRule ^ index.html [L]");
  assert.ok(privacyAt > 0 && termsAt > privacyAt && passAt > termsAt && spaAt > passAt);

  const privacy = "<!doctype html><title>Privacy</title>";
  const terms = "<!doctype html><title>Terms</title>";
  const spa = "<!doctype html><title>app</title>";
  const files = {
    [`${base}index.html`]: spa,
    [`${base}privacy/index.html`]: privacy,
    [`${base}terms/index.html`]: terms,
  };
  const htaccess = { [base]: preview };
  for (const suffix of ["privacy", "privacy/", "terms", "terms/"]) {
    const result = resolveRequest({ path: `${base}${suffix}`, host: "dev.yogeshkumarasamy.in", htaccess, files });
    assert.equal(result.status, 200, suffix);
    assert.equal(result.body.includes("<title>app</title>"), false, suffix);
    assert.match(result.contentType ?? "", /^text\/html/);
  }
  assert.equal(resolveRequest({ path: `${base}privacy`, host: "dev.yogeshkumarasamy.in", htaccess, files }).path, `${base}privacy/index.html`);
  assert.equal(resolveRequest({ path: `${base}terms/`, host: "dev.yogeshkumarasamy.in", htaccess, files }).body, terms);
  assert.equal(resolveRequest({ path: `${base}jobs/1`, host: "dev.yogeshkumarasamy.in", htaccess, files }).body, spa);

  const liveBase = "/yt-scheduler/";
  const live = {
    htaccess: { [liveBase]: spaHtaccess(liveBase) },
    files: {
      [`${liveBase}index.html`]: spa,
      [`${liveBase}privacy/index.html`]: privacy,
      [`${liveBase}terms/index.html`]: terms,
    },
  };
  for (const pathName of ["/yt-scheduler/privacy", "/yt-scheduler/privacy/", "/yt-scheduler/terms", "/yt-scheduler/terms/"]) {
    const result = resolveRequest({ path: pathName, host: "yogeshkumarasamy.in", htaccess: live.htaccess, files: live.files });
    assert.equal(result.status, 200, pathName);
    assert.equal(result.body === spa, false, pathName);
  }
});
