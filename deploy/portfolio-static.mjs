#!/usr/bin/env node
/**
 * Write the portfolio folder .htaccess into a built dist.
 *
 * The live FTP pipeline uploads that dist into /portfolio/ (or a preview
 * folder). The rewrite stays in the app folder. The host docroot is owned
 * by deploy/host-root.mjs and is not part of this dist.
 *
 *   node deploy/portfolio-static.mjs --dist apps/portfolio/dist
 *
 * APP_BASE selects the RewriteBase (default /portfolio/).
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { normalizeAppBase } from "../apps/portfolio/base-path.mjs";

export function portfolioHtaccess(basePath) {
  const base = normalizeAppBase(basePath);
  return `# Hash routing for the portfolio. Real files are served.
# The rewrite lives in this folder only. It does not apply to the host root.
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase ${base}
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  RewriteRule \\.(?:js|mjs|css|map|json|png|jpe?g|gif|svg|webp|ico|woff2?|txt|xml|webmanifest)$ - [R=404,L]
  RewriteRule ^ index.html [L]
</IfModule>
`;
}

export function writePortfolioStatic({ dist, base }) {
  const pageBase = normalizeAppBase(base);
  mkdirSync(dist, { recursive: true });
  const file = path.join(dist, ".htaccess");
  writeFileSync(file, portfolioHtaccess(pageBase));
  return { pageBase, file };
}

function argValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index === -1) return null;
  return argv[index + 1] ?? null;
}

function main(argv) {
  const dist = argValue(argv, "--dist");
  if (!dist) throw new Error("usage: portfolio-static.mjs --dist <dir>");
  const written = writePortfolioStatic({ dist, base: process.env.APP_BASE });
  console.log(`wrote portfolio .htaccess (${written.pageBase})`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
