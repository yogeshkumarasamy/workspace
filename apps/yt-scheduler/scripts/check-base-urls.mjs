/**
 * Fail the build when index.html or the web manifest still contains a
 * domain-root URL (`/icons/…`, `scope: "/"`) outside the configured APP_BASE.
 * CI runs this after `vite build` (see package.json and ci.yml).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { normalizeAppBase } from "../base-path.mjs";

/** Quoted path-absolute URLs. Ignores HTML `/>` and protocol-relative `//`. */
const ROOTED = /["'](\/(?!\/)[^"']*)["']/g;

export function rootedUrls(text) {
  return [...text.matchAll(ROOTED)].map((match) => match[1]);
}

export function urlsOutsideBase(text, base) {
  return rootedUrls(text).filter((url) => url !== base && !url.startsWith(base));
}

export function checkDist(distDir, base) {
  if (!existsSync(distDir)) throw new Error(`missing dist directory ${distDir}`);
  const names = [];
  if (existsSync(path.join(distDir, "index.html"))) names.push("index.html");
  for (const name of readdirSync(distDir)) {
    if (name.endsWith(".webmanifest") || name === "manifest.json") names.push(name);
  }
  if (names.length === 0) throw new Error(`no index.html or manifest in ${distDir}`);
  const problems = [];
  for (const name of names) {
    const bad = urlsOutsideBase(readFileSync(path.join(distDir, name), "utf8"), base);
    if (bad.length) problems.push({ file: name, urls: [...new Set(bad)] });
  }
  return problems;
}

function isDirectRun() {
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === pathToFileURL(entry).href;
}

if (isDirectRun()) {
  const base = normalizeAppBase();
  const distDir = path.resolve(process.argv[2] ?? path.join(path.dirname(new URL(import.meta.url).pathname), "../dist"));
  const problems = checkDist(distDir, base);
  if (problems.length) {
    console.error(`/-rooted URLs outside ${base}:`);
    for (const problem of problems) {
      console.error(`  ${problem.file}`);
      for (const url of problem.urls) console.error(`    ${url}`);
    }
    process.exit(1);
  }
  console.log(`base urls ok (${base})`);
}
