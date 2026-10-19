/**
 * Fail the build when index.html or the web manifest still contains a
 * domain-root URL (`/icons/…`, `scope: "/"`) outside the configured APP_BASE,
 * or when dist/privacy and dist/terms are missing or still need JavaScript.
 * CI runs this after `vite build` (see package.json and ci.yml).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
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

/** privacy/index.html and terms/index.html must be crawlable HTML under the app base. */
export function checkLegalPages(distDir, base) {
  const problems = [];
  for (const name of ["privacy", "terms"]) {
    const rel = `${name}/index.html`;
    const file = path.join(distDir, rel);
    if (!existsSync(file)) {
      problems.push({ file: rel, urls: ["missing"] });
      continue;
    }
    const html = readFileSync(file, "utf8");
    const urls = [];
    if (html.includes("__")) urls.push("unresolved placeholder");
    if (/<script[\s>]/i.test(html)) urls.push("script tag");
    urls.push(...urlsOutsideBase(html, base));
    if (urls.length) problems.push({ file: rel, urls: [...new Set(urls)] });
  }
  return problems;
}

function isDirectRun() {
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === pathToFileURL(entry).href;
}

if (isDirectRun()) {
  const base = normalizeAppBase();
  const distDir = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "../dist"));
  const problems = [...checkDist(distDir, base), ...checkLegalPages(distDir, base)];
  if (problems.length) {
    console.error(`static build check failed for ${base}:`);
    for (const problem of problems) {
      console.error(`  ${problem.file}`);
      for (const url of problem.urls) console.error(`    ${url}`);
    }
    process.exit(1);
  }
  console.log(`base urls ok (${base})`);
}
