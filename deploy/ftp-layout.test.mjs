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
    assert.match(text, /uses: \.\/\.github\/actions\/prepare-ftp-dirs/);
    assert.match(text, /bash \.github\/scripts\/ftp-put-files\.sh/);
    assert.equal(text.includes("SamKirkland/FTP-Deploy-Action"), false, label);
    assert.equal(text.includes("server-root:"), false, label);
  }

  assert.equal(preview.includes("SamKirkland/FTP-Deploy-Action"), false);
  assert.match(preview, /workflows:\s*\["CI"\]/);
  assert.match(preview, /uses:\s*\.\/\.github\/workflows\/deploy-static\.yml/);
  assert.match(preview, /slug_dir:\s*previews\/\$\{\{\s*matrix\.slug\s*\}\}\/pr-\$\{\{\s*needs\.ctx\.outputs\.pr\s*\}\}/);
  assert.match(preview, /group:\s*preview-pr-\$\{\{\s*needs\.ctx\.outputs\.pr\s*\}\}/);

  const ci = workflow("ci.yml");
  assert.match(ci, /APP_BASE:\s*\/previews\/<app>\/pr-\$\{\{\s*github\.event\.pull_request\.number\s*\}\}\//);
  assert.match(ci, /VITE_PWA:\s*"off"/);
  assert.match(ci, /node deploy\/plan\.mjs/);
});

test("the upload action lists the server-dir before it mirrors", () => {
  const action = readFileSync(path.join(root, ".github/actions/prepare-ftp-dirs/action.yml"), "utf8");
  const script = readFileSync(path.join(root, ".github/scripts/ftp-upload-dir.sh"), "utf8");
  assert.match(action, /server-dir:/);
  assert.match(action, /ftp-upload-dir\.sh/);
  assert.equal(action.includes("server-root"), false);
  assert.match(script, /cls -1F --basename/);
  assert.match(script, /mirror -R --delete/);
  assert.match(script, /inside-server-dir-only/);
  assert.match(script, /listing is missing/);
});

test("the dev path probe is dispatch-only and stays under _ftp-probe", () => {
  const text = workflow("ftp-path-probe.yml");
  assert.match(text, /workflow_dispatch:/);
  assert.equal(text.includes("push:"), false);
  assert.equal(text.includes("pull_request:"), false);
  assert.match(text, /_ftp-probe\/portfolio/);
  assert.match(text, /_ftp-probe\/yt-scheduler/);
  assert.match(text, /FTP_TARGET_DIR_DEV/);
  assert.equal(text.includes("FTP_TARGET_DIR_DEV }}/portfolio/"), false);
  assert.equal(text.includes("SamKirkland/FTP-Deploy-Action"), false);
  assert.match(text, /MODE: remove/);
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
  const cleanup = workflow("cleanup-preview.yml");
  assert.match(cleanup, /node-version:\s*"22"/);
  assert.match(workflow("deploy-main.yml"), /node-version:\s*"20"/);
});
