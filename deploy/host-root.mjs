#!/usr/bin/env node
/**
 * Infrastructure files for a host docroot (T13).
 *
 * These files are not part of the portfolio or yt-scheduler dist. An app
 * upload must not publish them: a mirror of the docroot would delete the
 * other app or /preview.
 *
 *   node deploy/host-root.mjs --env dev --out host-root [--api-origins <urls>]
 *   node deploy/host-root.mjs --preview-htaccess --out preview-root
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readRobots, renderPreviews, renderRoot } from "./htaccess.mjs";

export function rootIndexHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Yogesh Kumarasamy</title>
    <meta http-equiv="refresh" content="0; url=/portfolio/" />
    <link rel="canonical" href="https://yogeshkumarasamy.in/portfolio/" />
    <meta name="robots" content="noindex" />
  </head>
  <body>
    <p><a href="/portfolio/">Portfolio</a></p>
  </body>
</html>
`;
}

export function writeHostRoot({ env, outDir, apiOrigins = "" }) {
  mkdirSync(outDir, { recursive: true });
  const files = {
    "index.html": rootIndexHtml(),
    ".htaccess": renderRoot({ env, apiOrigins }),
    "robots.txt": readRobots(env),
  };
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(path.join(outDir, name), body);
  }
  return files;
}

export function writePreviewHtaccess(outDir) {
  mkdirSync(outDir, { recursive: true });
  const body = renderPreviews();
  writeFileSync(path.join(outDir, ".htaccess"), body);
  return body;
}

function argValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
}

function main(argv) {
  const outDir = argValue(argv, "--out");
  if (!outDir) throw new Error("usage: host-root.mjs --env <env> --out <dir> [--api-origins <urls>]");
  if (argv.includes("--preview-htaccess")) {
    writePreviewHtaccess(outDir);
    console.log(`wrote preview .htaccess in ${outDir}`);
    return;
  }
  const env = argValue(argv, "--env");
  if (!env) throw new Error("usage: host-root.mjs --env <env> --out <dir>");
  writeHostRoot({ env, outDir, apiOrigins: argValue(argv, "--api-origins") ?? "" });
  console.log(`wrote host root for ${env} in ${outDir}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
