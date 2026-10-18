import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function workflow(name) {
  return readFileSync(path.join(root, ".github/workflows", name), "utf8");
}

function serverDirs(text) {
  return [...text.matchAll(/server-dir:\s*(.+)/g)].map((match) => match[1].trim());
}

test("each app upload stays inside its own folder", () => {
  const dev = workflow("deploy-main.yml");
  const staging = workflow("deploy-staging.yml");
  const production = workflow("deploy-prod.yml");
  const preview = workflow("preview-deploy.yml");

  for (const [text, label] of [
    [dev, "dev"],
    [staging, "staging"],
    [production, "production"],
  ]) {
    const dirs = serverDirs(text);
    assert.ok(dirs.some((dir) => dir.endsWith("/portfolio/")), label);
    assert.ok(dirs.some((dir) => dir.endsWith("/yt-scheduler/")), label);
    for (const dir of dirs) {
      assert.match(dir, /\/(portfolio|yt-scheduler)\/$/, `${label} ${dir}`);
    }
    assert.match(text, /rel-dir: portfolio\n/);
    assert.match(text, /rel-dir: yt-scheduler\n/);
    assert.match(text, /uses: \.\/\.github\/actions\/prepare-ftp-dirs/);
    assert.match(text, /dangerous-clean-slate: false/);
    assert.match(text, /bash \.github\/scripts\/ftp-put-files\.sh/);
  }

  const previewDirs = serverDirs(preview);
  for (const dir of previewDirs) {
    assert.match(dir, /FTP_TARGET_DIR_DEV_PREVIEW \}\}\/(portfolio|yt-scheduler)\//, dir);
    assert.match(dir, /steps\.slug\.outputs\.dir/);
  }
  assert.match(preview, /rel-dir: portfolio\/\$\{\{ steps\.slug\.outputs\.dir \}\}/);
  assert.match(preview, /rel-dir: yt-scheduler\/\$\{\{ steps\.slug\.outputs\.dir \}\}/);
  assert.match(preview, /APP_BASE: \/preview\/portfolio\/pr-/);
  assert.match(preview, /APP_BASE: \/preview\/yt-scheduler\/pr-/);
  assert.equal(preview.includes("Pause before yt-scheduler FTP"), false);
  assert.equal(preview.includes("preview-mkdir.sh"), false);
});

test("legacy cleanup is dispatch-only and names the confirmation phrase", () => {
  const text = workflow("cleanup-legacy-root.yml");
  assert.match(text, /workflow_dispatch:/);
  assert.equal(text.includes("push:"), false);
  assert.equal(text.includes("pull_request:"), false);
  assert.match(text, /delete-legacy-root/);
  assert.match(text, /FTP_TARGET_DIR_DEV/);
  assert.match(text, /FTP_TARGET_DIR_STAGING/);
  assert.match(text, /FTP_TARGET_DIR \}\}/);
});

test("wrangler jobs stay on Node 22", () => {
  for (const name of ["deploy-main.yml", "deploy-staging.yml", "deploy-prod.yml"]) {
    const text = workflow(name);
    const yt = text.slice(text.indexOf("deploy-yt-scheduler"));
    assert.match(yt, /node-version:\s*"22"/, name);
  }
  const preview = workflow("preview-deploy.yml");
  const yt = preview.slice(preview.indexOf("preview-yt-scheduler"));
  assert.match(yt, /node-version:\s*"22"/);
  assert.match(workflow("deploy-main.yml"), /node-version:\s*"20"/);
  assert.match(preview, /node-version:\s*"20"/);
});
