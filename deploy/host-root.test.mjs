import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { portfolioHtaccess, writePortfolioStatic } from "./portfolio-static.mjs";
import { rootIndexHtml, writeHostRoot, writePreviewHtaccess } from "./host-root.mjs";
import { resolveRequest } from "./htaccess-sim.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..");

test("host root is a redirect owned outside either app", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "host-root-"));
  const files = writeHostRoot({
    env: "dev",
    outDir: dir,
    apiOrigins: "https://yt-scheduler-api-dev.coderdevelopment.workers.dev",
  });
  assert.deepEqual(readdirSync(dir).sort(), [".htaccess", "index.html", "robots.txt"]);
  assert.match(files["index.html"], /http-equiv="refresh" content="0; url=\/portfolio\/"/);
  assert.match(files[".htaccess"], /RewriteRule \^\$ \/portfolio\/ \[R=302,L\]/);
  assert.match(files[".htaccess"], /yt-scheduler-api-dev\.coderdevelopment\.workers\.dev/);
  assert.match(files["robots.txt"], /Disallow: \//);
  assert.equal(files["index.html"].includes("yk-desktop"), false);
  assert.equal(rootIndexHtml().includes("/yt-scheduler/"), false);
});

test("production host root keeps the portfolio sitemap and omits noindex", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "host-root-"));
  const files = writeHostRoot({ env: "production", outDir: dir });
  assert.match(files["robots.txt"], /Sitemap: https:\/\/yogeshkumarasamy\.in\/portfolio\/sitemap\.xml/);
  assert.equal(files[".htaccess"].includes("X-Robots-Tag"), false);
  assert.match(files[".htaccess"], /R=302/);
});

test("preview folder htaccess is only the noindex file", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "preview-ht-"));
  const body = writePreviewHtaccess(dir);
  assert.deepEqual(readdirSync(dir), [".htaccess"]);
  assert.match(body, /noindex, nofollow, noarchive/);
  assert.equal(body.includes("RewriteRule ^$ /portfolio/"), false);
});

test("portfolio htaccess is scoped to its own base", () => {
  const release = portfolioHtaccess("/portfolio/");
  assert.match(release, /RewriteBase \/portfolio\//);
  assert.match(release, /RewriteRule \^ index\.html \[L\]/);
  const preview = portfolioHtaccess("/preview/portfolio/pr-12/");
  assert.match(preview, /RewriteBase \/preview\/portfolio\/pr-12\//);
  assert.throws(() => portfolioHtaccess("portfolio"));
  const dir = mkdtempSync(path.join(tmpdir(), "portfolio-dist-"));
  const written = writePortfolioStatic({ dist: dir, base: "/portfolio/" });
  assert.equal(written.pageBase, "/portfolio/");
  assert.match(readFileSync(written.file, "utf8"), /RewriteBase \/portfolio\//);
});

test("old root assets do not capture /portfolio/ or /yt-scheduler/", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "host-root-"));
  const files = writeHostRoot({ env: "dev", outDir: dir });
  const tree = {
    htaccess: {
      "/": files[".htaccess"],
      "/portfolio/": portfolioHtaccess("/portfolio/"),
      "/yt-scheduler/": "Options -Indexes\nDirectoryIndex index.html\n",
    },
    files: {
      "/assets/old-app.js": "old-portfolio",
      "/fonts/ibm-plex-mono-400.woff2": "font",
      "/index.html": files["index.html"],
      "/portfolio/index.html": "portfolio",
      "/portfolio/assets/app.js": "new-portfolio",
      "/yt-scheduler/index.html": "yt",
      "/yt-scheduler/app-config.json": '{"ok":true}',
      "/preview/yt-scheduler/pr-9/index.html": "preview-yt",
    },
  };
  const home = resolveRequest({ path: "/", host: "dev.yogeshkumarasamy.in", htaccess: tree.htaccess, files: tree.files });
  assert.equal(home.status, 302);
  assert.equal(home.location, "/portfolio/");
  const oldAsset = resolveRequest({
    path: "/assets/old-app.js",
    host: "dev.yogeshkumarasamy.in",
    htaccess: tree.htaccess,
    files: tree.files,
  });
  assert.equal(oldAsset.status, 200);
  assert.equal(oldAsset.body, "old-portfolio");
  const portfolio = resolveRequest({
    path: "/portfolio/",
    host: "dev.yogeshkumarasamy.in",
    htaccess: tree.htaccess,
    files: tree.files,
  });
  assert.equal(portfolio.status, 200);
  assert.equal(portfolio.body, "portfolio");
  const yt = resolveRequest({
    path: "/yt-scheduler/app-config.json",
    host: "dev.yogeshkumarasamy.in",
    htaccess: tree.htaccess,
    files: tree.files,
  });
  assert.equal(yt.status, 200);
  assert.equal(yt.body, '{"ok":true}');
  const preview = resolveRequest({
    path: "/preview/yt-scheduler/pr-9/index.html",
    host: "dev.yogeshkumarasamy.in",
    htaccess: tree.htaccess,
    files: tree.files,
  });
  assert.equal(preview.status, 200);
  assert.equal(preview.body, "preview-yt");
});

function runBash(script, env) {
  return spawnSync("bash", [path.join(repo, script)], {
    cwd: repo,
    env: { ...process.env, ...env },
    encoding: "utf8",
  });
}

test("ftp upload dry-run targets the exact app folder and refuses the docroot", () => {
  const local = mkdtempSync(path.join(tmpdir(), "dist-"));
  spawnSync("mkdir", ["-p", path.join(local, "assets"), path.join(local, "fonts")]);
  const release = runBash(".github/scripts/ftp-upload-dir.sh", {
    DRY_RUN: "1",
    SERVER_DIR: "/public_html/yt-scheduler/",
    LOCAL_DIR: local,
  });
  assert.equal(release.status, 0, release.stderr);
  assert.match(release.stdout, /^server-dir: \/public_html\/yt-scheduler$/m);
  assert.match(release.stdout, /^mkdir: \/public_html\/yt-scheduler\/assets$/m);
  assert.match(release.stdout, /^mkdir: \/public_html\/yt-scheduler\/fonts$/m);
  assert.match(release.stdout, /^require-dir: assets\/$/m);
  assert.match(release.stdout, /^delete: inside-server-dir-only$/m);

  const preview = runBash(".github/scripts/ftp-upload-dir.sh", {
    DRY_RUN: "1",
    SERVER_DIR: "/public_html/preview/portfolio/pr-12/",
    LOCAL_DIR: local,
  });
  assert.equal(preview.status, 0, preview.stderr);
  assert.match(preview.stdout, /^server-dir: \/public_html\/preview\/portfolio\/pr-12$/m);
  assert.match(preview.stdout, /^require-dir: fonts\/$/m);

  const docroot = runBash(".github/scripts/ftp-upload-dir.sh", {
    DRY_RUN: "1",
    SERVER_DIR: "/public_html",
    LOCAL_DIR: local,
  });
  assert.equal(docroot.status, 1);
  assert.match(docroot.stderr, /refusing server-dir that is not an app folder/);

  const traversal = runBash(".github/scripts/ftp-upload-dir.sh", {
    DRY_RUN: "1",
    SERVER_DIR: "/public_html/portfolio/../yt-scheduler",
    LOCAL_DIR: local,
  });
  assert.equal(traversal.status, 1);
  assert.match(traversal.stderr, /refusing server-dir/);
});

test("ftp upload listing check fails when assets/ is missing", () => {
  const local = mkdtempSync(path.join(tmpdir(), "dist-"));
  spawnSync("mkdir", ["-p", path.join(local, "assets"), path.join(local, "fonts")]);
  const fixture = path.join(local, "listing.txt");
  spawnSync("bash", ["-c", `printf 'fonts/\\nindex.html\\n' > ${JSON.stringify(fixture)}`]);
  const missing = runBash(".github/scripts/ftp-upload-dir.sh", {
    MODE: "check",
    SERVER_DIR: "/public_html/_ftp-probe/portfolio",
    LOCAL_DIR: local,
    LISTING_FIXTURE: fixture,
  });
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /missing assets\//);

  spawnSync("bash", ["-c", `printf 'assets/\\nfonts/\\nindex.html\\n' > ${JSON.stringify(fixture)}`]);
  const ok = runBash(".github/scripts/ftp-upload-dir.sh", {
    MODE: "check",
    SERVER_DIR: "/public_html/_ftp-probe/portfolio",
    LOCAL_DIR: local,
    LISTING_FIXTURE: fixture,
  });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /Required directories are present: assets\/ fonts\//);
});

test("ftp probe removal refuses an app folder", () => {
  const refused = runBash(".github/scripts/ftp-upload-dir.sh", {
    DRY_RUN: "1",
    MODE: "remove",
    SERVER_DIR: "/public_html/portfolio",
  });
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /_ftp-probe/);

  const ok = runBash(".github/scripts/ftp-upload-dir.sh", {
    DRY_RUN: "1",
    MODE: "remove",
    SERVER_DIR: "/public_html/_ftp-probe",
  });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /^remove: inside-probe-only$/m);
});

test("ftp put dry-run uploads only the host files", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "put-"));
  writeHostRoot({ env: "staging", outDir: dir });
  const run = runBash(".github/scripts/ftp-put-files.sh", {
    DRY_RUN: "1",
    FTP_ROOT: "public_html",
    LOCAL_DIR: dir,
  });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /^public_html\/index\.html$/m);
  assert.match(run.stdout, /^public_html\/\.htaccess$/m);
  assert.match(run.stdout, /^public_html\/robots\.txt$/m);
  assert.equal(run.stdout.includes("portfolio"), false);
});

test("ftp put refuses an app asset", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "put-"));
  writeHostRoot({ env: "dev", outDir: dir });
  spawnSync("bash", ["-c", `echo x > ${JSON.stringify(path.join(dir, "app.js"))}`]);
  const run = runBash(".github/scripts/ftp-put-files.sh", {
    DRY_RUN: "1",
    FTP_ROOT: "public_html",
    LOCAL_DIR: dir,
  });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /refusing to upload app\.js/);
});

test("legacy cleanup is opt-in and never names an app folder", () => {
  const refused = runBash(".github/scripts/cleanup-legacy-root.sh", {
    DRY_RUN: "1",
    FTP_ROOT: "/public_html",
    CONFIRM: "yes",
  });
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /delete-legacy-root/);

  const run = runBash(".github/scripts/cleanup-legacy-root.sh", {
    DRY_RUN: "1",
    FTP_ROOT: "/public_html",
    CONFIRM: "delete-legacy-root",
  });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /rm -r -f "\/public_html\/assets"/);
  assert.match(run.stdout, /rm -f "\/public_html\/sitemap\.xml"/);
  assert.match(run.stdout, /rm -f "\/public_html\/\.ftp-deploy-sync-state\.json"/);
  for (const kept of ["portfolio", "yt-scheduler", "preview", "previews", "index.html", "robots.txt", ".htaccess"]) {
    assert.equal(run.stdout.includes(`/${kept}"`), false, kept);
  }
});
