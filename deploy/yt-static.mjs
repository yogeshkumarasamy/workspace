#!/usr/bin/env node
/**
 * Write app-config.json and a flat SPA .htaccess into a yt-scheduler dist.
 *
 * The live FTP pipeline uploads the dist folder as-is. History routes need a
 * rewrite in that folder. The release-engine template assumes a releases/<sha>
 * layout and is not used here.
 *
 *   node deploy/yt-static.mjs --dist apps/yt-scheduler/dist --env dev [--pr N]
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

export function writeStaticConfig({ dist, env, pr, processEnv = process.env }) {
  const urls = publicUrls(env, pr);
  const config = buildAppConfig({ env, pr, processEnv });
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
