#!/usr/bin/env node
/**
 * Write app-config.json and a flat SPA .htaccess into a yt-scheduler dist.
 *
 * The live FTP pipeline uploads the dist folder as-is. History routes need a
 * rewrite in that folder. The release-engine template assumes a releases/<sha>
 * layout and is not used here.
 *
 *   node deploy/yt-static.mjs --dist apps/yt-scheduler/dist --env dev [--pr N]
 *
 * Production writes the public Google client id and, when set, the picker
 * key. It does not read YT_API_KEY, YT_ENCRYPTION_KEY, or GOOGLE_CLIENT_SECRET.
 * Those stay on the Worker. The production UI asks for the API key at sign-in.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildAppConfig, publicUrls } from "./yt-worker.mjs";

export function spaHtaccess(basePath) {
  const base = basePath.endsWith("/") ? basePath : `${basePath}/`;
  if (!base.startsWith("/")) throw new Error(`RewriteBase must be an absolute path, received ${basePath}`);
  return `# History routing for the yt-scheduler static app.
# Real files are served. Missing hashed assets 404. Every other path is the SPA.
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase ${base}
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  RewriteRule \\.(?:js|mjs|css|map|json|png|jpe?g|gif|svg|webp|ico|woff2?|txt|webmanifest)$ - [R=404,L]
  RewriteRule ^ index.html [L]
</IfModule>
<IfModule mod_headers.c>
  <Files "app-config.json">
    Header set Cache-Control "no-store"
  </Files>
  <Files "index.html">
    Header set Cache-Control "no-cache"
  </Files>
</IfModule>
`;
}

const PRODUCTION_FIELDS = new Set(["apiBaseUrl", "youtubeMode", "driveScope", "googleClientId", "pickerApiKey"]);
const SECRET_ENV_NAMES = ["YT_API_KEY", "YT_ENCRYPTION_KEY", "GOOGLE_CLIENT_SECRET"];

function assertProductionConfig(config, processEnv) {
  if (!processEnv.GOOGLE_CLIENT_ID) {
    throw new Error(
      "missing GOOGLE_CLIENT_ID. Production app-config writes the public client id and an optional GOOGLE_PICKER_API_KEY, and no Worker secrets.",
    );
  }
  const unexpected = Object.keys(config).filter((key) => !PRODUCTION_FIELDS.has(key));
  if (unexpected.length || config.apiKey) {
    throw new Error(`production app-config must not include ${unexpected.join(", ") || "apiKey"}`);
  }
  const serialized = JSON.stringify(config);
  const leaked = SECRET_ENV_NAMES.filter((name) => processEnv[name] && serialized.includes(processEnv[name]));
  if (leaked.length) throw new Error(`production app-config must not contain ${leaked.join(", ")}`);
}

export function writeStaticConfig({ dist, env, pr, processEnv = process.env }) {
  const urls = publicUrls(env, pr);
  const config = buildAppConfig({ env, pr, processEnv });
  if (env === "production") assertProductionConfig(config, processEnv);
  mkdirSync(dist, { recursive: true });
  writeFileSync(path.join(dist, "app-config.json"), `${JSON.stringify(config, null, 2)}\n`);
  writeFileSync(path.join(dist, ".htaccess"), spaHtaccess(urls.pageBase));
  return { config, pageBase: urls.pageBase };
}

function argValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
}

function main(argv) {
  const dist = argValue(argv, "--dist");
  const env = argValue(argv, "--env");
  const pr = argValue(argv, "--pr") ?? process.env.PR_NUMBER;
  if (!dist || !env) throw new Error("usage: yt-static.mjs --dist <dir> --env <env> [--pr N]");
  const written = writeStaticConfig({ dist, env, pr, processEnv: process.env });
  console.log(`wrote app-config.json (${written.config.youtubeMode}) and .htaccess (${written.pageBase})`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
