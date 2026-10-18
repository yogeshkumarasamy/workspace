import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { resolveRequest } from "./htaccess-sim.mjs";
import {
  HOSTS,
  lintHtaccess,
  lintTemplates,
  readRobots,
  renderPreviews,
  renderRelease,
  renderRoot,
  renderRouter,
  runCli,
} from "./htaccess.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const PREV = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const OLD = "cccccccccccccccccccccccccccccccccccccccc";
const HTML = "<!doctype html><title>app</title>";
const ORIGINS = {
  dev: "https://ib-console-api-dev.example.workers.dev https://ib-customer-api-dev.example.workers.dev",
  staging: "https://ib-console-api-staging.example.workers.dev https://ib-customer-api-staging.example.workers.dev",
  production: "https://ib-console-api.example.workers.dev https://ib-customer-api.example.workers.dev",
};

function header(result, name) {
  return result.headers[name.toLowerCase()];
}

function releaseTree(base, sha, { previous = "", phpApi = false, files = {} } = {}) {
  const dir = `${base}releases/${sha}/`;
  return {
    htaccess: {
      [base]: renderRouter({ base, current: sha }),
      [dir]: renderRelease({ base, sha, previous, phpApi }),
    },
    files: {
      [`${dir}index.html`]: HTML,
      [`${dir}app-config.json`]: '{"env":"dev"}',
      [`${dir}.release.json`]: `{"sha":"${sha}"}`,
      [`${dir}sw.js`]: "/* sw */",
      [`${dir}registerSW.js`]: "/* register */",
      [`${dir}manifest.webmanifest`]: "{}",
      [`${dir}assets/app-CCCCCCCC.js`]: "console.log('current')",
      ...files,
    },
  };
}

function merge(parts) {
  return parts.reduce(
    (tree, part) => ({
      htaccess: { ...tree.htaccess, ...part.htaccess },
      files: { ...tree.files, ...part.files },
    }),
    { htaccess: {}, files: {} },
  );
}

function site(env, extra = {}) {
  const portfolio = releaseTree("/portfolio/", SHA);
  const consoleApp = releaseTree("/ib-console/", SHA, {
    previous: PREV,
    files: {
      [`/ib-console/releases/${PREV}/index.html`]: HTML,
      [`/ib-console/releases/${PREV}/assets/vendor-BBBBBBBB.js`]: "prev-chunk",
      [`/ib-console/releases/${OLD}/index.html`]: HTML,
      [`/ib-console/releases/${OLD}/assets/vendor-AAAAAAAA.js`]: "old-chunk",
    },
  });
  consoleApp.htaccess[`/ib-console/releases/${PREV}/`] = renderRelease({
    base: "/ib-console/",
    sha: PREV,
    previous: OLD,
  });
  consoleApp.htaccess[`/ib-console/releases/${OLD}/`] = renderRelease({
    base: "/ib-console/",
    sha: OLD,
  });
  const previewBase = "/previews/ib-console/pr-42/";
  const preview = releaseTree(previewBase, SHA, {
    files: {
      [`${previewBase}releases/${SHA}/assets/app-CCCCCCCC.js`]: "preview-chunk",
    },
  });
  const tree = merge([
    {
      htaccess: { "/": renderRoot({ env, apiOrigins: ORIGINS[env] }), "/previews/": renderPreviews() },
      files: {
        "/dev/secret.html": "leak",
        "/staging/secret.html": "leak",
        "/developer.html": "ok",
        "/index.html": "old-root",
        "/og.png": "png",
        "/favicon.svg": "svg",
        "/sitemap.xml": "<urlset></urlset>",
      },
    },
    portfolio,
    consoleApp,
    preview,
    extra,
  ]);
  return tree;
}

function request(env, pathName, options = {}) {
  const tree = options.tree ?? site(env);
  return resolveRequest({
    path: pathName,
    host: options.host ?? HOSTS[env],
    https: options.https,
    headers: options.headers,
    htaccess: tree.htaccess,
    files: tree.files,
  });
}

test("templates stay inside the LiteSpeed directive subset", () => {
  assert.deepEqual(lintTemplates(), []);
  const bad = [
    'RewriteRule ^ /portfolio/ [R=302,L] # trailing',
    'Header edit Content-Security-Policy "default-src \'self\'"',
    '<If "%{HTTPS} == \'on\'">',
    "Options +Indexes",
    "RewriteRule ^ index.html [R=200]",
  ];
  for (const line of bad) assert.ok(lintHtaccess(line).length > 0, line);
});

test("root render keeps the plan rules and drops noindex only on production", () => {
  const dev = renderRoot({ env: "dev", apiOrigins: ORIGINS.dev });
  const staging = renderRoot({ env: "staging", apiOrigins: ORIGINS.staging });
  const production = renderRoot({ env: "production", apiOrigins: ORIGINS.production });
  for (const text of [dev, staging, production]) {
    assert.match(text, /RewriteRule \^ https:\/\/%\{HTTP_HOST\}%\{REQUEST_URI\} \[R=301,L\]/);
    assert.match(text, /RewriteCond %\{HTTP_HOST\} \^www\\\.\(yogeshkumarasamy\\\.in\)\$ \[NC\]/);
    assert.match(text, /RewriteRule \^ https:\/\/%1%\{REQUEST_URI\} \[R=301,L\]/);
    assert.match(text, /RewriteRule \^\(dev\|staging\)\(\/\|\$\) - \[R=404,L\]/);
    assert.match(text, /RewriteRule \^previews\(\/\|\$\) - \[R=404,L\]/);
    assert.match(text, /RewriteRule \^\$ \/portfolio\/ \[R=302,L\]/);
    assert.match(text, /keeps #hash routes/);
    assert.match(text, /Strict-Transport-Security "max-age=31536000"/);
    assert.match(text, /X-Content-Type-Options "nosniff"/);
    assert.match(text, /Referrer-Policy "strict-origin-when-cross-origin"/);
    assert.match(text, /X-Frame-Options "SAMEORIGIN"/);
    assert.match(text, /Permissions-Policy "camera=\(\), microphone=\(\), geolocation=\(self\)"/);
    assert.match(text, /Content-Security-Policy-Report-Only "/);
    assert.equal(text.includes("Content-Security-Policy \""), false);
    assert.equal(text.includes("__"), false);
  }
  assert.match(dev, new RegExp(ORIGINS.dev.replaceAll(".", "\\.")));
  assert.match(staging, /X-Robots-Tag "noindex, nofollow"/);
  assert.equal(production.includes("X-Robots-Tag"), false);
  assert.equal(production.includes("noindex"), false);
  const sameOrigins = renderRoot({ env: "dev", apiOrigins: ORIGINS.dev });
  assert.equal(renderRoot({ env: "staging", apiOrigins: ORIGINS.dev }), sameOrigins);
  assert.match(renderRoot({ env: "dev" }), /connect-src 'self';/);
});

test("router and release placeholders render, and Option B stays opt-in", () => {
  const router = renderRouter({ base: "/previews/yt-scheduler/pr-7/", current: SHA });
  assert.match(router, /RewriteBase \/previews\/yt-scheduler\/pr-7\//);
  assert.match(router, new RegExp(`RewriteRule \\^\\(\\.\\*\\)\\$ releases/${SHA}/\\$1 \\[L\\]`));
  assert.match(router, /RewriteRule \^releases\/ - \[L\]/);

  const first = renderRelease({ base: "/portfolio/", sha: SHA });
  assert.equal(first.includes("__"), false);
  assert.equal(first.includes("api/index.php"), false);
  assert.equal(first.includes("Require all denied"), false);
  assert.equal(first.includes("__PREVIOUS__"), false);
  assert.match(first, /RewriteBase \/portfolio\/releases\/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\//);
  const staticRule = first.indexOf("R=404,L,NC");
  const fallback = first.indexOf("RewriteRule ^ index.html [L]");
  assert.ok(staticRule > 0 && staticRule < fallback);

  const chained = renderRelease({ base: "/ib/", sha: SHA, previous: PREV });
  assert.match(chained, new RegExp(`RewriteRule \\^assets/\\(\\.\\+\\)\\$ /ib/releases/${PREV}/assets/\\$1 \\[L\\]`));
  assert.ok(chained.indexOf(`/ib/releases/${PREV}/assets/`) < chained.indexOf("R=404,L,NC"));

  const php = renderRelease({ base: "/yt-scheduler/", sha: SHA, previous: PREV, phpApi: true });
  assert.match(php, /RewriteRule \^api\/ api\/index\.php \[L\]/);
  assert.match(php, /<FilesMatch "\\\.\(sql\|lock\|neon\|dist\|md\)\$">/);
  assert.match(php, /Require all denied/);
  assert.match(php, /Service-Worker-Allowed "\/yt-scheduler\/"/);
  assert.match(php, /no-cache, must-revalidate/);
  assert.match(php, /max-age=31536000, immutable/);

  const source = readFileSync(path.join(root, "htaccess/release.htaccess.tpl"), "utf8");
  assert.match(source, /Option B \(yt-scheduler PHP API\) only/);
  assert.match(source, /Omitted on the first release/);
});

test("previews template and per-host robots.txt", () => {
  const previews = renderPreviews();
  assert.match(previews, /X-Robots-Tag "noindex, nofollow, noarchive"/);
  assert.match(previews, /Cache-Control "no-store"/);
  assert.match(previews, /RewriteRule \^\(\[a-z-\]\+\/\?\)\?\$ - \[R=404,L\]/);
  assert.equal(readRobots("dev"), readRobots("staging"));
  assert.equal(readRobots("dev"), "User-agent: *\nDisallow: /\n");
  assert.equal(
    readRobots("production"),
    "User-agent: *\nAllow: /\n\nSitemap: https://yogeshkumarasamy.in/portfolio/sitemap.xml\n",
  );
});

test("renderer rejects path, sha, and origin injection", () => {
  assert.throws(() => renderRouter({ base: "/etc/passwd", current: SHA }));
  assert.throws(() => renderRouter({ base: "/previews/ib-console/pr-0/", current: SHA }));
  assert.throws(() => renderRelease({ base: "/portfolio/", sha: "not a sha" }));
  assert.throws(() => renderRelease({ base: "/portfolio/", sha: SHA, previous: SHA }));
  assert.throws(() => renderRoot({ env: "prod", apiOrigins: ORIGINS.production }));
  assert.throws(() => renderRoot({ env: "dev", apiOrigins: "http://ib-console-api.example.workers.dev" }));
  assert.throws(() => renderRoot({ env: "dev", apiOrigins: "https://ok.example/;evil" }));
});

test("deep links return index.html and a missing script is a real 404", () => {
  const deep = request("dev", "/ib-console/team/42");
  assert.equal(deep.status, 200);
  assert.equal(deep.body, HTML);
  assert.match(deep.contentType, /^text\/html/);
  assert.equal(deep.path, `/ib-console/releases/${SHA}/index.html`);

  const hashed = request("dev", "/ib-console/assets/app-CCCCCCCC.js");
  assert.equal(hashed.status, 200);
  assert.equal(hashed.contentType, "text/javascript");
  assert.equal(hashed.body, "console.log('current')");

  const missing = request("dev", "/ib-console/assets/missing-DDDDDDDD.js");
  assert.equal(missing.status, 404);
  assert.equal(missing.body, "");
  assert.equal(missing.contentType, null);
  assert.equal(String(missing.body).includes("<!doctype"), false);

  const portfolio = request("production", "/portfolio/about");
  assert.equal(portfolio.status, 200);
  assert.equal(portfolio.body, HTML);
});

test("shell files revalidate and content-hashed assets are immutable", () => {
  for (const pathName of [
    "/ib-console/",
    "/ib-console/index.html",
    "/ib-console/app-config.json",
    "/ib-console/.release.json",
    "/ib-console/sw.js",
    "/ib-console/registerSW.js",
    "/ib-console/manifest.webmanifest",
  ]) {
    const result = request("staging", pathName);
    assert.equal(result.status, 200, pathName);
    assert.equal(header(result, "Cache-Control"), "no-cache, must-revalidate", pathName);
  }
  const asset = request("staging", "/ib-console/assets/app-CCCCCCCC.js");
  assert.equal(header(asset, "Cache-Control"), "public, max-age=31536000, immutable");
  const worker = request("staging", "/ib-console/sw.js");
  assert.equal(header(worker, "Service-Worker-Allowed"), "/ib-console/");
  const previewWorker = request("dev", "/previews/ib-console/pr-42/sw.js");
  assert.equal(header(previewWorker, "Service-Worker-Allowed"), "/previews/ib-console/pr-42/");
});

test("an old tab still loads a chunk from the previous release, and a pruned release 404s", () => {
  const chunk = request("dev", "/ib-console/assets/vendor-BBBBBBBB.js");
  assert.equal(chunk.status, 200);
  assert.equal(chunk.body, "prev-chunk");
  assert.equal(chunk.path, `/ib-console/releases/${PREV}/assets/vendor-BBBBBBBB.js`);
  assert.equal(header(chunk, "Cache-Control"), "public, max-age=31536000, immutable");

  const older = request("dev", "/ib-console/assets/vendor-AAAAAAAA.js");
  assert.equal(older.status, 200);
  assert.equal(older.body, "old-chunk");
  assert.equal(older.path, `/ib-console/releases/${OLD}/assets/vendor-AAAAAAAA.js`);

  const tree = site("dev");
  delete tree.htaccess[`/ib-console/releases/${PREV}/`];
  delete tree.htaccess[`/ib-console/releases/${OLD}/`];
  delete tree.files[`/ib-console/releases/${PREV}/assets/vendor-BBBBBBBB.js`];
  const pruned = request("dev", "/ib-console/assets/vendor-BBBBBBBB.js", { tree });
  assert.equal(pruned.status, 404);
  assert.equal(pruned.contentType, null);

  const first = site("dev");
  first.htaccess["/portfolio/"] = renderRouter({ base: "/portfolio/", current: SHA });
  first.htaccess[`/portfolio/releases/${SHA}/`] = renderRelease({ base: "/portfolio/", sha: SHA });
  const gone = request("dev", "/portfolio/assets/missing-EEEEEEEE.js", { tree: first });
  assert.equal(gone.status, 404);
  assert.equal(gone.body, "");
});

test("apex hides nested dev and staging folders; previews 404 off the dev host", () => {
  const apexDev = request("production", "/dev/secret.html");
  assert.equal(apexDev.status, 404);
  assert.equal(apexDev.body, "");
  const apexStaging = request("production", "/staging/");
  assert.equal(apexStaging.status, 404);
  const developer = request("production", "/developer.html");
  assert.equal(developer.status, 200);
  assert.equal(developer.body, "ok");
  const onDevHost = request("dev", "/dev/secret.html");
  assert.equal(onDevHost.status, 200);
  assert.equal(onDevHost.body, "leak");

  for (const env of ["staging", "production"]) {
    const hidden = request(env, "/previews/ib-console/pr-42/team/1");
    assert.equal(hidden.status, 404, env);
    assert.equal(header(hidden, "X-Robots-Tag"), env === "production" ? undefined : "noindex, nofollow");
    assert.equal(String(header(hidden, "X-Robots-Tag") ?? "").includes("noarchive"), false);
  }
  const listing = request("dev", "/previews/");
  assert.equal(listing.status, 404);
  assert.equal(header(listing, "X-Robots-Tag"), "noindex, nofollow, noarchive");
  const appListing = request("dev", "/previews/ib-console/");
  assert.equal(appListing.status, 404);
  const preview = request("dev", "/previews/ib-console/pr-42/team/1");
  assert.equal(preview.status, 200);
  assert.equal(preview.body, HTML);
  assert.match(header(preview, "X-Robots-Tag"), /noindex/);
  assert.match(header(preview, "X-Robots-Tag"), /noarchive/);
});

test("dev and staging responses are noindex; production responses are not", () => {
  for (const env of ["dev", "staging"]) {
    const page = request(env, "/portfolio/");
    assert.match(header(page, "X-Robots-Tag"), /noindex/, env);
    const missing = request(env, "/portfolio/assets/missing-DDDDDDDD.js");
    assert.equal(missing.status, 404);
    assert.match(header(missing, "X-Robots-Tag"), /noindex/, env);
  }
  const prod = request("production", "/portfolio/");
  assert.equal(header(prod, "X-Robots-Tag"), undefined);
  const prodMissing = request("production", "/no-such-file.js");
  assert.equal(prodMissing.status, 404);
  assert.equal(header(prodMissing, "X-Robots-Tag"), undefined);
});

test("HTTP redirects to HTTPS, www redirects to the apex, and security headers stay report-only", () => {
  const http = request("production", "/portfolio/about", { https: false, host: "yogeshkumarasamy.in" });
  assert.equal(http.status, 301);
  assert.equal(http.location, "https://yogeshkumarasamy.in/portfolio/about");
  assert.equal(header(http, "Strict-Transport-Security"), "max-age=31536000");

  const proxied = request("production", "/", {
    https: false,
    headers: { "X-Forwarded-Proto": "https" },
  });
  assert.equal(proxied.status, 302);
  assert.equal(proxied.location, "/portfolio/");

  const www = request("production", "/portfolio/", { host: "www.yogeshkumarasamy.in" });
  assert.equal(www.status, 301);
  assert.equal(www.location, "https://yogeshkumarasamy.in/portfolio/");

  const httpWww = request("production", "/ib-console/team", {
    https: false,
    host: "www.yogeshkumarasamy.in",
  });
  assert.equal(httpWww.status, 301);
  assert.equal(httpWww.location, "https://www.yogeshkumarasamy.in/ib-console/team");

  const home = request("dev", "/");
  assert.equal(home.status, 302);
  assert.equal(home.location, "/portfolio/");
  assert.equal(home.location.includes("#"), false);
  const followed = request("dev", home.location);
  assert.equal(followed.status, 200);
  assert.equal(followed.body, HTML);

  const oldIndex = request("production", "/index.html");
  assert.equal(oldIndex.status, 301);
  assert.equal(oldIndex.location, "/portfolio/index.html");
  assert.equal(request("production", "/og.png").location, "/portfolio/og.png");
  assert.equal(request("production", "/sitemap.xml").location, "/portfolio/sitemap.xml");

  const dot = request("production", "/portfolio/.env");
  assert.equal(dot.status, 404);
  assert.equal(request("production", "/.git/HEAD", { tree: site("production", { files: { "/.git/HEAD": "ref: refs/heads/main" } }) }).body, "");
  assert.equal(request("dev", "/.ftp-deploy-sync-state.json").status, 404);

  const page = request("staging", "/ib-console/");
  for (const [name, value] of [
    ["Strict-Transport-Security", "max-age=31536000"],
    ["X-Content-Type-Options", "nosniff"],
    ["Referrer-Policy", "strict-origin-when-cross-origin"],
    ["X-Frame-Options", "SAMEORIGIN"],
    ["Permissions-Policy", "camera=(), microphone=(), geolocation=(self)"],
  ]) {
    assert.equal(header(page, name), value, name);
  }
  const csp = header(page, "Content-Security-Policy-Report-Only");
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /https:\/\/ib-console-api-staging\.example\.workers\.dev/);
  assert.equal(header(page, "Content-Security-Policy"), undefined);
  const denied = request("production", "/dev/");
  assert.equal(denied.status, 404);
  assert.equal(header(denied, "X-Content-Type-Options"), "nosniff");
  assert.equal(header(denied, "Content-Security-Policy"), undefined);
});

test("Option B routes /api to the PHP front controller and denies SQL internals", () => {
  const base = "/yt-scheduler/";
  const php = releaseTree(base, SHA, {
    phpApi: true,
    files: {
      [`${base}releases/${SHA}/api/index.php`]: "<?php echo 'api';",
      [`${base}releases/${SHA}/migrations/001.sql`]: "select 1",
    },
  });
  const tree = {
    htaccess: { "/": renderRoot({ env: "production", apiOrigins: ORIGINS.production }), ...php.htaccess },
    files: php.files,
  };
  const api = request("production", "/yt-scheduler/api/orders", { tree });
  assert.equal(api.status, 200);
  assert.equal(api.body, "<?php echo 'api';");
  assert.equal(api.path, `${base}releases/${SHA}/api/index.php`);
  const sql = request("production", "/yt-scheduler/migrations/001.sql", { tree });
  assert.equal(sql.status, 403);
  assert.equal(sql.body, "");

  const spa = releaseTree(base, SHA, {
    files: { [`${base}releases/${SHA}/api/index.php`]: "<?php echo 'api';" },
  });
  const withoutPhp = request("production", "/yt-scheduler/api/orders", {
    tree: { htaccess: { "/": tree.htaccess["/"], ...spa.htaccess }, files: { ...spa.files } },
  });
  assert.equal(withoutPhp.status, 200);
  assert.equal(withoutPhp.body, HTML);
});

test("CLI check renders every template without writing a host", () => {
  assert.equal(runCli(["check"]), 0);
  const cli = path.join(root, "htaccess.mjs");
  const run = spawnSync(process.execPath, [cli, "robots", "--env", "production"], { encoding: "utf8" });
  assert.equal(run.status, 0);
  assert.match(run.stdout, /Sitemap: https:\/\/yogeshkumarasamy\.in\/portfolio\/sitemap\.xml/);
  const rejected = spawnSync(process.execPath, [cli, "router", "--base", "/tmp/", "--current", SHA], { encoding: "utf8" });
  assert.equal(rejected.status, 1);
});
