import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import http from "node:http";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  TEMPLATE_PATHS,
  assertRemoteAllowed,
  firstAssetReference,
  isAncestor,
  parseClsNames,
  parsePreviousSha,
  parseRouterSha,
  publicOriginFor,
  publishRelease,
  remoteJoin,
  renderTemplate,
  selectReleasesToPrune,
  sslLines,
  tlsCheckHostnameValue,
  validateDeploy,
} from "./ftp-release.mjs";

const ROUTER_TEMPLATE = `Options -Indexes
RewriteEngine On
RewriteBase __BASE__
# Requests already inside releases/ are handled by that release
RewriteRule ^releases/ - [L]
RewriteRule ^(.*)$ releases/__CURRENT__/$1 [L]
`;

const RELEASE_TEMPLATE = `Options -Indexes
DirectoryIndex index.html
RewriteEngine On
RewriteBase __BASE__releases/__SHA__/
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]
# Missing hashed assets fall back to the previous release.
RewriteRule ^assets/(.+)$ __BASE__releases/__PREVIOUS__/assets/$1 [L]
RewriteRule \\.(js|mjs|css|map|json|webmanifest|png|jpe?g|gif|svg|webp|avif|ico|woff2?|txt|xml)$ - [R=404,L,NC]
RewriteRule ^ index.html [L]
`;

function writeTemplates(dir) {
  const releaseTemplate = path.join(dir, "release.htaccess.tpl");
  const routerTemplate = path.join(dir, "router.htaccess.tpl");
  writeFileSync(releaseTemplate, RELEASE_TEMPLATE);
  writeFileSync(routerTemplate, ROUTER_TEMPLATE);
  return { releaseTemplate, routerTemplate };
}

function baseSettings(overrides = {}) {
  return {
    host: "127.0.0.1",
    port: 21,
    user: "ftpdeploy",
    password: "testpass1",
    envDir: "",
    ssl: "off",
    allowRemote: false,
    switchMode: "auto",
    env: "dev",
    target: "portfolio",
    slugDir: "portfolio",
    base: "/portfolio/",
    sha: "abc1234",
    apiBaseUrl: "",
    keep: 5,
    smokeRetries: 1,
    smokeDelayMs: 0,
    skipSmoke: true,
    dist: "/tmp/dist",
    repo: process.cwd(),
    releaseTemplate: "/tmp/release.htaccess.tpl",
    routerTemplate: "/tmp/router.htaccess.tpl",
    publicOrigin: "",
    builtAt: undefined,
    now: () => new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

test("template paths are the T10 files", () => {
  assert.equal(path.basename(TEMPLATE_PATHS.release), "release.htaccess.tpl");
  assert.equal(path.basename(TEMPLATE_PATHS.router), "router.htaccess.tpl");
  assert.equal(path.basename(path.dirname(TEMPLATE_PATHS.release)), "htaccess");
  assert.equal(existsSync(TEMPLATE_PATHS.release), true);
  assert.equal(existsSync(TEMPLATE_PATHS.router), true);
});

test("renderTemplate substitutes tokens and drops the previous-release rule on the first deploy", () => {
  const first = renderTemplate(
    RELEASE_TEMPLATE,
    { BASE: "/portfolio/", SHA: "abc1234", PREVIOUS: "" },
    { omitTokens: ["PREVIOUS"] },
  );
  assert.equal(first.includes("__"), false);
  assert.match(first, /RewriteBase \/portfolio\/releases\/abc1234\//);
  assert.equal(first.includes("assets/"), false);

  const second = renderTemplate(RELEASE_TEMPLATE, {
    BASE: "/ib-console/",
    SHA: "bbbbbbb",
    PREVIOUS: "abc1234",
  });
  assert.ok(
    second.includes("RewriteRule ^assets/(.+)$ /ib-console/releases/abc1234/assets/$1 [L]"),
  );
  assert.equal(parsePreviousSha(second), "abc1234");

  const router = renderTemplate(ROUTER_TEMPLATE, { BASE: "/portfolio/", CURRENT: "bbbbbbb" });
  assert.equal(parseRouterSha(router), "bbbbbbb");
  assert.throws(
    () => renderTemplate("Hello __UNKNOWN__\n", {}),
    /Unresolved template token/,
  );
});

test("prune keeps the newest five and never the live or previous release", () => {
  const releases = [
    { name: "drop", builtAtMs: 0 },
    { name: "current", builtAtMs: 1 },
    { name: "previous", builtAtMs: 2 },
    { name: "c", builtAtMs: 3 },
    { name: "d", builtAtMs: 4 },
    { name: "e", builtAtMs: 5 },
    { name: "f", builtAtMs: 6 },
    { name: "g", builtAtMs: 7 },
  ];
  const decision = selectReleasesToPrune(releases, { keep: 5, current: "current", previous: "previous" });
  assert.deepEqual(decision.prune, ["drop"]);
  assert.equal(decision.keep.includes("current"), true);
  assert.equal(decision.keep.includes("previous"), true);
});

test("cls names ignore noise and keep partial directories", () => {
  const entries = parseClsNames(`
cache flushed
3333333/
2222222.partial/
abc1234/
drwxr-xr-x not a name
`);
  assert.deepEqual(entries, [
    { name: "3333333", type: "dir" },
    { name: "2222222.partial", type: "dir" },
    { name: "abc1234", type: "dir" },
  ]);
});

test("remote paths reject traversal and preserve an absolute docroot", () => {
  assert.equal(remoteJoin("", "portfolio", "releases", "abc"), "portfolio/releases/abc");
  assert.equal(remoteJoin("/public_html", "portfolio"), "/public_html/portfolio");
  assert.throws(() => remoteJoin("/public_html/../etc", "portfolio"), /must not contain/);
});

test("TLS keeps certificate verification and skips only the hostname check by default", () => {
  assert.deepEqual(sslLines(baseSettings({ ssl: "off" })), [
    "set ftp:ssl-allow false",
    "set ssl:verify-certificate no",
  ]);
  assert.deepEqual(sslLines(baseSettings({ ssl: "require" })), [
    "set ftp:ssl-force true",
    "set ftp:ssl-protect-data true",
    "set ssl:verify-certificate yes",
    "set ssl:check-hostname no",
  ]);
  assert.equal(tlsCheckHostnameValue(undefined), "no");
  assert.deepEqual(sslLines(baseSettings({ ssl: "require", tlsCheckHostname: "yes" })), [
    "set ftp:ssl-force true",
    "set ftp:ssl-protect-data true",
    "set ssl:verify-certificate yes",
    "set ssl:check-hostname yes",
  ]);
  const templates = writeTemplates(mkdtempSync(path.join(tmpdir(), "tpl-")));
  assert.throws(
    () => validateDeploy(baseSettings({ ...templates, ssl: "require", tlsCheckHostname: "maybe" })),
    /FTP_TLS_CHECK_HOSTNAME/,
  );
});

test("non-local FTP hosts are refused unless the workflow opts in", () => {
  assert.doesNotThrow(() => assertRemoteAllowed("127.0.0.1", false));
  assert.throws(() => assertRemoteAllowed("ftp.yogeshkumarasamy.in", false), /FTP_ALLOW_REMOTE/);
  assert.throws(() => assertRemoteAllowed("files.hostinger.com", false), /FTP_ALLOW_REMOTE/);
  assert.doesNotThrow(() => assertRemoteAllowed("ftp.yogeshkumarasamy.in", true));
  assert.equal(publicOriginFor("preview"), "https://dev.yogeshkumarasamy.in");
  assert.equal(publicOriginFor("production"), "https://yogeshkumarasamy.in");
});

test("validation accepts a preview slug and rejects a planner git SHA passed as base", () => {
  const templates = writeTemplates(mkdtempSync(path.join(tmpdir(), "tpl-")));
  validateDeploy(
    baseSettings({
      ...templates,
      env: "preview",
      target: "ib-console",
      slugDir: "previews/ib-console/pr-42",
      base: "/previews/ib-console/pr-42/",
    }),
  );
  assert.throws(
    () => validateDeploy(baseSettings({ ...templates, base: "abc1234" })),
    /site path/,
  );
  assert.throws(
    () => validateDeploy(baseSettings({ ...templates, slugDir: "../portfolio" })),
    /slug_dir/,
  );
});

test("a missing T10 template fails before any FTP connection", async () => {
  const dist = mkdtempSync(path.join(tmpdir(), "dist-"));
  writeFileSync(path.join(dist, "index.html"), "<!doctype html>\n");
  const called = [];
  await assert.rejects(
    () =>
      publishRelease(
        {
          ...baseSettings(),
          dist,
          releaseTemplate: path.join(dist, "missing-release.tpl"),
          routerTemplate: path.join(dist, "missing-router.tpl"),
        },
        { transport: { async get() { called.push("get"); return false; } } },
      ),
    /T10/,
  );
  assert.deepEqual(called, []);
});

test("ancestor guard allows a descendant and fails closed on an unknown live SHA", () => {
  const repo = makeRepo(3);
  const [first, , third] = repo.shas;
  assert.deepEqual(isAncestor("", third, { cwd: repo.dir }), { ok: true, reason: "no-live-release" });
  assert.equal(isAncestor(first, third, { cwd: repo.dir }).ok, true);
  assert.equal(isAncestor(third, first, { cwd: repo.dir }).reason, "not-ancestor");
  assert.equal(isAncestor(third, third, { cwd: repo.dir }).reason, "same-sha");
  const unknown = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  assert.equal(isAncestor(unknown, third, { cwd: repo.dir }).reason, "unknown-live-sha");
});

test("index.html asset reference is the first assets script", () => {
  assert.equal(
    firstAssetReference(`<script type="module" src="./assets/index-abc12345.js"></script>`),
    "./assets/index-abc12345.js",
  );
  assert.equal(firstAssetReference("<h1>Hi</h1>"), null);
});

test("auto mode falls back to rm + mv when rename-over fails, and smoke failure rolls back", async () => {
  const repo = makeRepo(2);
  const [older, newer] = repo.shas;
  const templates = writeTemplates(mkdtempSync(path.join(tmpdir(), "tpl-")));
  const transport = createMemoryTransport();
  transport.failNextHtaccessMoves(1);
  const first = await publishRelease(
    releaseOptions(repo.dir, templates, older, { builtAt: "2026-01-01T00:00:00.000Z" }),
    { transport },
  );
  assert.equal(first.result, "deployed");
  assert.equal(first.switchMode, "rm-then-mv");
  assert.equal(parseRouterSha(memoryText(transport, "portfolio/.htaccess")), older);

  const failingFetch = async () => ({
    ok: false,
    status: 500,
    async json() {
      return {};
    },
    async text() {
      return "";
    },
    headers: { get: () => "" },
  });
  const second = await publishRelease(
    releaseOptions(repo.dir, templates, newer, {
      builtAt: "2026-01-01T00:00:01.000Z",
      skipSmoke: false,
      publicOrigin: "http://127.0.0.1:9",
      smokeRetries: 1,
      smokeDelayMs: 0,
    }),
    { transport, fetch: failingFetch },
  );
  assert.equal(second.result, "rolled-back");
  assert.equal(parseRouterSha(memoryText(transport, "portfolio/.htaccess")), older);
  const keptNewer = memoryText(transport, `portfolio/releases/${newer}/.release.json`);
  assert.equal(JSON.parse(keptNewer).sha, newer);
  assert.equal(JSON.parse(keptNewer).target, "portfolio");
});

test("an older SHA does not replace a newer live release in the memory transport", async () => {
  const repo = makeRepo(2);
  const [older, newer] = repo.shas;
  const templates = writeTemplates(mkdtempSync(path.join(tmpdir(), "tpl-")));
  const transport = createMemoryTransport();
  await publishRelease(
    releaseOptions(repo.dir, templates, newer, { builtAt: "2026-01-01T00:00:02.000Z" }),
    { transport },
  );
  const again = await publishRelease(
    releaseOptions(repo.dir, templates, older, { builtAt: "2026-01-01T00:00:03.000Z" }),
    { transport },
  );
  assert.equal(again.result, "superseded");
  assert.equal(again.live, newer);
  assert.equal(parseRouterSha(memoryText(transport, "portfolio/.htaccess")), newer);
  assert.equal(memoryText(transport, `portfolio/releases/${newer}/marker.txt`).toString(), newer);
});

const ftpReady = ftpToolsAvailable();

test(
  "pure-ftpd: newest SHA stays live, old chunks chain, prune keeps five, older run is superseded",
  { timeout: 180_000, skip: ftpReady ? false : "lftp, pure-ftpd, or passwordless sudo is not available" },
  async () => {
    const repo = makeRepo(7);
    const templates = writeTemplates(mkdtempSync(path.join(tmpdir(), "tpl-")));
    const ftp = await startPureFtpd();
    const site = await startReleaseSite(ftp.root);
    const bad = await startServer((_req, res) => {
      res.writeHead(500, { "content-type": "text/plain" });
      res.end("smoke failed");
    });
    try {
      const partial = path.join(ftp.root, "portfolio", "releases", `${repo.shas[0]}.partial`);
      mkdirSync(partial, { recursive: true });
      writeFileSync(path.join(partial, "evil.txt"), "evil");

      const published = [];
      for (let index = 0; index < 6; index += 1) {
        const sha = repo.shas[index];
        const result = await publishRelease(
          releaseOptions(repo.dir, templates, sha, {
            port: ftp.port,
            user: ftp.user,
            password: ftp.password,
            builtAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
            skipSmoke: false,
            publicOrigin: site.origin,
            smokeRetries: 2,
            smokeDelayMs: 50,
            extraFiles:
              index === 3
                ? { "assets/old-chunk.js": "chunk-from-3" }
                : {},
          }),
        );
        assert.equal(result.result, "deployed", `deploy ${index} ${result.result}`);
        assert.equal(result.switchMode, "rename-over");
        if (index === 0) {
          const firstRelease = path.join(ftp.root, "portfolio", "releases", sha);
          assert.equal(existsSync(path.join(firstRelease, "evil.txt")), false);
          assert.equal(existsSync(`${firstRelease}.partial`), false);
        }
        assert.equal(result.live, sha);
        published.push(result);
      }

      const root = path.join(ftp.root, "portfolio");
      const releaseDir = path.join(root, "releases");
      const names = readdirSync(releaseDir);
      assert.equal(names.includes(repo.shas[0]), false);
      for (const sha of repo.shas.slice(1, 6)) {
        assert.equal(names.includes(sha), true);
        assert.equal(readFileSync(path.join(releaseDir, sha, "marker.txt"), "utf8"), sha);
        assert.equal(existsSync(path.join(releaseDir, sha, "evil.txt")), false);
      }
      assert.equal(names.some((name) => name.endsWith(".partial")), false);
      assert.equal(parseRouterSha(readFileSync(path.join(root, ".htaccess"), "utf8")), repo.shas[5]);
      assert.equal(
        parsePreviousSha(readFileSync(path.join(releaseDir, repo.shas[5], ".htaccess"), "utf8")),
        repo.shas[4],
      );
      assert.equal(
        parsePreviousSha(readFileSync(path.join(releaseDir, repo.shas[4], ".htaccess"), "utf8")),
        repo.shas[3],
      );
      assert.equal(
        parsePreviousSha(readFileSync(path.join(releaseDir, repo.shas[1], ".htaccess"), "utf8")),
        repo.shas[0],
      );
      const config = JSON.parse(readFileSync(path.join(releaseDir, repo.shas[5], "app-config.json"), "utf8"));
      assert.deepEqual(config, { env: "dev", apiBaseUrl: "", sha: repo.shas[5] });
      const releaseJson = JSON.parse(readFileSync(path.join(releaseDir, repo.shas[5], ".release.json"), "utf8"));
      assert.equal(releaseJson.sha, repo.shas[5]);
      assert.equal(releaseJson.target, "portfolio");

      const oldChunk = await fetchText(site.origin, "/portfolio/assets/old-chunk.js");
      assert.equal(oldChunk.status, 200);
      assert.equal(oldChunk.body, "chunk-from-3");
      assert.match(oldChunk.type, /javascript/);

      const superseded = await publishRelease(
        releaseOptions(repo.dir, templates, repo.shas[1], {
          port: ftp.port,
          user: ftp.user,
          password: ftp.password,
          builtAt: "2026-01-01T00:00:30.000Z",
          skipSmoke: true,
        }),
      );
      assert.equal(superseded.result, "superseded");
      assert.equal(superseded.live, repo.shas[5]);
      assert.equal(parseRouterSha(readFileSync(path.join(root, ".htaccess"), "utf8")), repo.shas[5]);
      assert.equal(
        parsePreviousSha(readFileSync(path.join(releaseDir, repo.shas[1], ".htaccess"), "utf8")),
        repo.shas[0],
      );

      const rolled = await publishRelease(
        releaseOptions(repo.dir, templates, repo.shas[6], {
          port: ftp.port,
          user: ftp.user,
          password: ftp.password,
          builtAt: "2026-01-01T00:00:40.000Z",
          skipSmoke: false,
          publicOrigin: bad.origin,
          smokeRetries: 1,
          smokeDelayMs: 0,
        }),
      );
      assert.equal(rolled.result, "rolled-back");
      assert.equal(rolled.live, repo.shas[5]);
      assert.equal(parseRouterSha(readFileSync(path.join(root, ".htaccess"), "utf8")), repo.shas[5]);
      assert.equal(existsSync(path.join(releaseDir, repo.shas[6], "index.html")), true);

      const forced = await publishRelease(
        releaseOptions(repo.dir, templates, repo.shas[0], {
          port: ftp.port,
          user: ftp.user,
          password: ftp.password,
          target: "ib",
          slugDir: "ib",
          base: "/ib/",
          switchMode: "rm-then-mv",
          skipSmoke: true,
          builtAt: "2026-01-01T00:00:50.000Z",
        }),
      );
      assert.equal(forced.result, "deployed");
      assert.equal(forced.switchMode, "rm-then-mv");
      assert.equal(parseRouterSha(readFileSync(path.join(ftp.root, "ib", ".htaccess"), "utf8")), repo.shas[0]);
      assert.equal(published[5].pruned.includes(repo.shas[0]), true);
    } finally {
      await site.close();
      await bad.close();
      await ftp.stop();
    }
  },
);

function releaseOptions(repo, templates, sha, overrides = {}) {
  const { extraFiles, ...rest } = overrides;
  const dist = mkdtempSync(path.join(tmpdir(), "dist-"));
  const asset = `assets/index-${sha.slice(0, 8)}.js`;
  mkdirSync(path.join(dist, "assets"), { recursive: true });
  writeFileSync(
    path.join(dist, "index.html"),
    `<!doctype html><script type="module" src="./${asset}"></script>\n`,
  );
  writeFileSync(path.join(dist, asset), "export default 1;\n");
  writeFileSync(path.join(dist, "marker.txt"), sha);
  for (const [name, body] of Object.entries(extraFiles ?? {})) {
    const file = path.join(dist, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, body);
  }
  return {
    host: "127.0.0.1",
    port: 2121,
    user: "ftpdeploy",
    password: "testpass1",
    envDir: "",
    ssl: "off",
    allowRemote: false,
    switchMode: "auto",
    env: "dev",
    target: "portfolio",
    slugDir: "portfolio",
    base: "/portfolio/",
    sha,
    apiBaseUrl: "",
    keep: 5,
    smokeRetries: 1,
    smokeDelayMs: 0,
    skipSmoke: true,
    dist,
    repo,
    ...templates,
    ...rest,
  };
}

function makeRepo(count) {
  const dir = mkdtempSync(path.join(tmpdir(), "release-repo-"));
  const git = (args) => {
    const result = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout || `git ${args.join(" ")} failed`);
    return result.stdout.trim();
  };
  git(["init", "-b", "main"]);
  git(["config", "user.email", "deploy-test@example.com"]);
  git(["config", "user.name", "Deploy Test"]);
  const shas = [];
  for (let index = 0; index < count; index += 1) {
    writeFileSync(path.join(dir, "history.txt"), `commit ${index}\n`);
    git(["add", "history.txt"]);
    git(["commit", "-m", `commit ${index}`]);
    shas.push(git(["rev-parse", "HEAD"]));
  }
  return { dir, shas };
}

function memoryText(transport, remote) {
  const value = transport.files.get(remote);
  assert.ok(value, `missing ${remote}`);
  return value.toString();
}

function createMemoryTransport() {
  const files = new Map();
  const dirs = new Set();
  let failHtaccessMoves = 0;

  function normalize(remote) {
    return String(remote).replace(/^\/+/, "").replace(/\/+$/, "");
  }
  function ensureDir(remote) {
    const parts = normalize(remote).split("/").filter(Boolean);
    let acc = "";
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part;
      dirs.add(acc);
    }
  }

  return {
    files,
    failNextHtaccessMoves(count) {
      failHtaccessMoves = count;
    },
    async mkdirp(remote) {
      ensureDir(remote);
    },
    async remove(remote) {
      const key = normalize(remote);
      for (const file of [...files.keys()]) {
        if (file === key || file.startsWith(`${key}/`)) files.delete(file);
      }
      for (const dir of [...dirs]) {
        if (dir === key || dir.startsWith(`${key}/`)) dirs.delete(dir);
      }
    },
    async move(from, to) {
      const src = normalize(from);
      const dest = normalize(to);
      if (failHtaccessMoves > 0 && dest.endsWith("/.htaccess")) {
        failHtaccessMoves -= 1;
        throw new Error("simulated rename-over failure");
      }
      const destIsDir =
        dirs.has(dest) || [...files.keys()].some((file) => file.startsWith(`${dest}/`));
      if (destIsDir) throw new Error(`refusing to rename over directory ${dest}`);
      if (files.has(dest)) files.delete(dest);
      const moving = [...files.keys()].filter((file) => file === src || file.startsWith(`${src}/`));
      if (moving.length === 0 && !dirs.has(src)) throw new Error(`missing ${src}`);
      for (const file of moving) {
        const next = file === src ? dest : `${dest}${file.slice(src.length)}`;
        files.set(next, files.get(file));
        files.delete(file);
      }
      for (const dir of [...dirs]) {
        if (dir === src || dir.startsWith(`${src}/`)) {
          const next = dir === src ? dest : `${dest}${dir.slice(src.length)}`;
          dirs.delete(dir);
          dirs.add(next);
        }
      }
    },
    async put(localFile, remote) {
      const key = normalize(remote);
      files.set(key, readFileSync(localFile));
      ensureDir(key.split("/").slice(0, -1).join("/"));
    },
    async get(remote, localFile) {
      const key = normalize(remote);
      if (!files.has(key)) return false;
      writeFileSync(localFile, files.get(key));
      return true;
    },
    async list(remote) {
      const prefix = normalize(remote);
      const names = new Map();
      const consider = (full, exactType) => {
        if (full === prefix || !full.startsWith(`${prefix}/`)) return;
        const rest = full.slice(prefix.length + 1);
        const name = rest.split("/")[0];
        const type = rest.includes("/") ? "dir" : exactType;
        if (!names.has(name) || type === "dir") names.set(name, type);
      };
      for (const file of files.keys()) consider(file, "file");
      for (const dir of dirs) consider(dir, "dir");
      return [...names].map(([name, type]) => ({ name, type }));
    },
    async mirror(localDir, remote) {
      const root = normalize(remote);
      ensureDir(root);
      const walk = (dir, remoteDir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const local = path.join(dir, entry.name);
          const next = `${remoteDir}/${entry.name}`;
          if (entry.isDirectory()) {
            ensureDir(next);
            walk(local, next);
          } else if (entry.isFile()) {
            files.set(next, readFileSync(local));
          }
        }
      };
      walk(localDir, root);
    },
  };
}

function ftpToolsAvailable() {
  const lftp = spawnSync("lftp", ["-c", "version"], { encoding: "utf8" });
  const ftpd = spawnSync("pure-ftpd", ["--help"], { encoding: "utf8" });
  const sudo = spawnSync("sudo", ["-n", "true"], { encoding: "utf8" });
  return lftp.status === 0 && ftpd.status === 0 && sudo.status === 0;
}

async function startPureFtpd() {
  const root = mkdtempSync(path.join(tmpdir(), "ftp-root-"));
  const id = Math.random().toString(16).slice(2);
  const passwd = path.join(tmpdir(), `purepw-${id}`);
  const pdb = `${passwd}.pdb`;
  const pidfile = `${passwd}.pid`;
  writeFileSync(passwd, "");
  const user = "ftpdeploy";
  const password = "testpass1";
  const add = spawnSync(
    "pure-pw",
    [
      "useradd",
      user,
      "-f",
      passwd,
      "-u",
      String(process.getuid()),
      "-g",
      String(process.getgid()),
      "-d",
      root,
    ],
    { input: `${password}\n${password}\n`, encoding: "utf8" },
  );
  if (add.status !== 0) throw new Error(add.stderr || add.stdout || "pure-pw useradd failed");
  const mkdb = spawnSync("pure-pw", ["mkdb", pdb, "-f", passwd], { encoding: "utf8" });
  if (mkdb.status !== 0) throw new Error(mkdb.stderr || mkdb.stdout || "pure-pw mkdb failed");

  let last = "pure-ftpd did not start";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const base = 25000 + Math.floor(Math.random() * 15000);
    const started = spawnSync(
      "sudo",
      [
        "pure-ftpd",
        "-S",
        `127.0.0.1,${base}`,
        "-c",
        "30",
        "-C",
        "20",
        "-B",
        "-E",
        "-j",
        "-z",
        "-D",
        "-Y",
        "0",
        "-p",
        `${base + 1}:${base + 40}`,
        "-P",
        "127.0.0.1",
        "-l",
        `puredb:${pdb}`,
        "-g",
        pidfile,
      ],
      { encoding: "utf8" },
    );
    if (started.status !== 0) {
      last = started.stderr || started.stdout || `exit ${started.status}`;
      continue;
    }
    try {
      await waitForPort(base);
      return {
        root,
        port: base,
        user,
        password,
        async stop() {
          if (existsSync(pidfile)) {
            const pid = readFileSync(pidfile, "utf8").trim();
            spawnSync("sudo", ["kill", pid]);
            await waitForExit(pid);
          }
          rmSync(passwd, { force: true });
          rmSync(pdb, { force: true });
          rmSync(pidfile, { force: true });
          rmSync(root, { recursive: true, force: true });
        },
      };
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(last);
}

function waitForPort(port) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const attempt = () => {
      const socket = net.connect(port, "127.0.0.1");
      socket.once("connect", () => {
        socket.end();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - started > 4000) reject(new Error(`port ${port} did not open`));
        else setTimeout(attempt, 100);
      });
    };
    attempt();
  });
}

async function waitForExit(pid) {
  for (let i = 0; i < 20; i += 1) {
    try {
      process.kill(Number(pid), 0);
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

function startServer(handler) {
  const server = http.createServer(handler);
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        origin: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

function startReleaseSite(root) {
  return startServer((req, res) => {
    const served = resolveReleaseRequest(root, req.url ?? "/");
    if (!served) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("missing");
      return;
    }
    res.writeHead(served.status, { "content-type": served.type });
    res.end(served.body);
  });
}

function resolveReleaseRequest(root, rawUrl) {
  const pathname = decodeURIComponent(new URL(rawUrl, "http://127.0.0.1").pathname);
  const match = pathname.match(/^\/([a-z0-9-]+)\/(.*)$/);
  if (!match || pathname.includes("..")) return null;
  return resolveUnderSlug(root, match[1], match[2], new Set());
}

function resolveUnderSlug(root, slug, rest, seen) {
  const key = `${slug}:${rest}`;
  if (seen.has(key)) return null;
  seen.add(key);
  const slugDir = path.join(root, slug);
  const router = readIf(path.join(slugDir, ".htaccess"));
  const current = router ? parseRouterSha(router) : null;
  const mapped = current && !rest.startsWith("releases/") ? `releases/${current}/${rest}` : rest;
  const absolute = path.join(slugDir, mapped);
  if (existsSync(absolute) && statSync(absolute).isFile()) {
    return { status: 200, type: contentType(absolute), body: readFileSync(absolute) };
  }
  const release = mapped.match(/^releases\/([0-9a-f]{7,40})\/(.*)$/);
  if (!release) return null;
  const [, sha, inner] = release;
  const releaseHt = readIf(path.join(slugDir, "releases", sha, ".htaccess")) ?? "";
  const previous = parsePreviousSha(releaseHt);
  if (previous && inner.startsWith("assets/")) {
    return resolveUnderSlug(root, slug, `releases/${previous}/${inner}`, seen);
  }
  if (/\.(js|mjs|css|map|json|webmanifest|png|jpe?g|gif|svg|webp|avif|ico|woff2?|txt|xml)$/i.test(inner)) {
    return { status: 404, type: "text/plain", body: "404" };
  }
  const index = path.join(slugDir, "releases", sha, "index.html");
  if (existsSync(index)) return { status: 200, type: "text/html", body: readFileSync(index) };
  return null;
}

function readIf(file) {
  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

function contentType(file) {
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".json")) return "application/json";
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  return "application/octet-stream";
}

async function fetchText(origin, pathname) {
  const response = await fetch(new URL(pathname, origin));
  return {
    status: response.status,
    type: response.headers.get("content-type") || "",
    body: await response.text(),
  };
}
