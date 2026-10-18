import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  createPlan,
  createReport,
  githubLastSuccessfulSha,
  loadTargets,
  normalizeAffected,
  resolvePushBase,
  toStrategyMatrix,
} from "./plan.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const targets = loadTargets();
const BASE = "base-sha";
const PR = 42;

function preview(overrides = {}) {
  return createReport({
    targets,
    event: "pull_request",
    ref: "feature/order-cutoff",
    baseRef: "main",
    prNumber: PR,
    baseSha: BASE,
    workersSubdomain: "acct",
    ...overrides,
  });
}

function entry(report, target) {
  const found = report.deploy.find((item) => item.target === target);
  assert.ok(found, `missing ${target} in ${report.deploy.map((item) => item.target).join(", ")}`);
  return found;
}

function names(report) {
  return report.deploy.map((item) => item.target);
}

const flat = (value) => value === null || ["string", "boolean", "number"].includes(typeof value);

test("targets.json declares apps, dist paths, and which API each UI uses", () => {
  assert.deepEqual(Object.keys(targets), [
    "portfolio",
    "ib-console",
    "ib",
    "yt-scheduler",
    "ib-console-api",
    "ib-customer-api",
  ]);
  assert.equal(targets.portfolio.package, "@apps/portfolio");
  assert.equal(targets.portfolio.dist, "apps/portfolio/dist");
  assert.equal(targets.portfolio.routing, "hash");
  assert.equal(targets["ib-console"].api, "ib-console-api");
  assert.equal(targets.ib.api, "ib-customer-api");
  assert.equal(targets["yt-scheduler"].api, "yt-scheduler-api");
  assert.equal(targets["yt-scheduler"].dist, "apps/yt-scheduler/dist");
  assert.equal(targets["ib-console-api"].d1, "ib");
  assert.equal(targets["ib-customer-api"].d1, "ib");
  assert.equal(targets["ib-console-api"].contract, "@contracts/innings-break");
  assert.equal("yt-scheduler-api" in targets, false);
});

test("row 1: a UI-only change previews that UI against the dev API", () => {
  const report = preview({
    affected: [{ name: "@apps/innings-break-console", reason: "FileChanged" }],
    changedFiles: ["apps/innings-break-console/src/App.tsx"],
  });
  assert.deepEqual(names(report), ["ib-console"]);
  const ui = entry(report, "ib-console");
  assert.equal(ui.reason, "affected");
  assert.equal(ui.env, "preview");
  assert.equal(ui.kind, "static");
  assert.equal(ui.host, "dev.yogeshkumarasamy.in");
  assert.equal(ui.path, "/previews/ib-console/pr-42/");
  assert.equal(ui.apiBaseUrl, "https://ib-console-api-dev.acct.workers.dev");
  assert.equal(ui.freshDb, false);
  assert.equal(ui.d1, null);
  assert.deepEqual(report.test, ["@apps/innings-break-console"]);
  assert.deepEqual(report.build, ["@apps/innings-break-console"]);

  const yt = preview({
    affected: [{ name: "@apps/yt-scheduler", reason: "TaskFileChanged" }],
  });
  assert.deepEqual(names(yt), ["yt-scheduler"]);
  assert.equal(entry(yt, "yt-scheduler").apiBaseUrl, "https://yt-scheduler-api-dev.acct.workers.dev");
  assert.equal(entry(yt, "yt-scheduler").path, "/previews/yt-scheduler/pr-42/");
});

test("row 1 from changed files only, with no turbo output", () => {
  const report = preview({
    changedFiles: ["apps/portfolio/src/content/profile.ts"],
  });
  assert.deepEqual(names(report), ["portfolio"]);
  const ui = entry(report, "portfolio");
  assert.equal(ui.path, "/previews/portfolio/pr-42/");
  assert.equal(ui.apiBaseUrl, null);
  assert.equal(ui.reason, "affected");
});

test("row 2: API code only deploys the API and auto-rebuilds the paired UI against the PR API", () => {
  const report = preview({
    affected: [{ name: "@services/ib-console-api", reason: "FileChanged" }],
    changedFiles: ["services/ib-console-api/src/index.ts"],
  });
  assert.deepEqual(names(report), ["ib-console-api", "ib-customer-api", "ib", "ib-console"]);
  const api = entry(report, "ib-console-api");
  const ui = entry(report, "ib-console");
  assert.equal(api.reason, "affected");
  assert.equal(api.kind, "cf-worker");
  assert.equal(api.path, "ib-console-api-pr-42");
  assert.equal(api.apiBaseUrl, null);
  assert.equal(api.freshDb, false);
  assert.equal(api.schemaChanged, false);
  assert.equal(api.d1, "ib-pr-42");
  assert.equal(ui.reason, "paired-api");
  assert.equal(ui.apiBaseUrl, "https://ib-console-api-pr-42.acct.workers.dev");
  assert.equal(ui.path, "/previews/ib-console/pr-42/");
  assert.deepEqual(report.test, ["@services/ib-console-api"]);
  assert.deepEqual(report.build, [
    "@services/ib-console-api",
    "@services/ib-customer-api",
    "@apps/innings-break",
    "@apps/innings-break-console",
  ]);
});

test("row 3: API plus migrations deploys a fresh preview DB and flags the contract check", () => {
  const report = preview({
    affected: [{ name: "@services/ib-console-api", reason: "FileChanged" }],
    changedFiles: ["services/ib-console-api/migrations/0002_orders.sql"],
  });
  for (const target of ["ib-console-api", "ib-customer-api"]) {
    const api = entry(report, target);
    assert.equal(api.freshDb, true, target);
    assert.equal(api.schemaChanged, true, target);
    assert.equal(api.contractCheck, true, target);
    assert.equal(api.d1, "ib-pr-42");
  }
  for (const target of ["ib", "ib-console"]) {
    const ui = entry(report, target);
    assert.equal(ui.freshDb, false, target);
    assert.equal(ui.contractCheck, true, target);
    assert.match(ui.apiBaseUrl, /-pr-42\.acct\.workers\.dev$/);
  }
  assert.equal(entry(report, "ib-console").reason, "paired-api");
});

test("row 4: UI and API both changed, so the UI keeps reason affected and uses the PR API", () => {
  const report = preview({
    affected: [
      { name: "@apps/innings-break-console", reason: "FileChanged" },
      { name: "@services/ib-console-api", reason: "TaskFileChanged" },
    ],
  });
  assert.equal(entry(report, "ib-console").reason, "affected");
  assert.equal(entry(report, "ib-console").apiBaseUrl, "https://ib-console-api-pr-42.acct.workers.dev");
  assert.equal(entry(report, "ib-console-api").reason, "affected");
  assert.equal(entry(report, "ib-console-api").freshDb, false);
  assert.equal(entry(report, "ib").reason, "shared-d1");
  assert.deepEqual(report.test, ["@apps/innings-break-console", "@services/ib-console-api"]);
});

test("row 5: a contract package plans both APIs and both UIs against the PR API", () => {
  const report = preview({
    affected: [{ name: "@contracts/innings-break", reason: "FileChanged" }],
  });
  assert.deepEqual(names(report), ["ib-console-api", "ib-customer-api", "ib", "ib-console"]);
  for (const target of names(report)) {
    assert.equal(entry(report, target).reason, "dependent", target);
    assert.equal(entry(report, target).contractCheck, true, target);
  }
  assert.equal(entry(report, "ib-console").apiBaseUrl, "https://ib-console-api-pr-42.acct.workers.dev");
  assert.equal(entry(report, "ib").apiBaseUrl, "https://ib-customer-api-pr-42.acct.workers.dev");
  assert.equal(entry(report, "ib-console-api").freshDb, true);
  assert.equal(entry(report, "ib-customer-api").d1, entry(report, "ib-console-api").d1);
  assert.ok(report.test.includes("@contracts/innings-break"));
  assert.equal(report.build.includes("@contracts/innings-break"), false);

  const fromFiles = preview({
    changedFiles: ["packages/innings-break-contract/src/order.ts"],
  });
  assert.deepEqual(names(fromFiles), names(report));
  assert.equal(entry(fromFiles, "ib-console-api").freshDb, true);
});

test("row 6: a shared library deploys every dependent UI against the dev API", () => {
  const report = preview({
    affected: [
      { name: "@repo/ui", reason: "FileChanged" },
      { name: "@apps/portfolio", reason: "DependencyChanged" },
      { name: "@apps/yt-scheduler", reason: "DependencyChanged" },
    ],
    changedFiles: ["packages/ui/index.ts"],
  });
  assert.deepEqual(names(report), ["portfolio", "yt-scheduler"]);
  assert.equal(entry(report, "portfolio").reason, "dependent");
  assert.equal(entry(report, "portfolio").apiBaseUrl, null);
  assert.equal(entry(report, "yt-scheduler").reason, "dependent");
  assert.equal(entry(report, "yt-scheduler").apiBaseUrl, "https://yt-scheduler-api-dev.acct.workers.dev");
  assert.deepEqual(report.test, ["@apps/portfolio", "@apps/yt-scheduler", "@repo/ui"]);
  assert.deepEqual(report.build, ["@apps/portfolio", "@apps/yt-scheduler"]);
});

test("row 7: specs, docs, and markdown deploy nothing even if turbo lists a package", () => {
  const report = preview({
    affected: [{ name: "@apps/portfolio", reason: "FileChanged" }],
    changedFiles: [
      "specs/innings-break/console/prd.md",
      "docs/ci-cd.md",
      "README.md",
      "apps/portfolio/README.md",
    ],
  });
  assert.equal(report.skip, "non-deploy-paths");
  assert.deepEqual(report.deploy, []);
  assert.deepEqual(report.test, []);
  assert.deepEqual(report.build, []);
});

test("IB shared D1: either API plans both Workers, both UIs, and one ib-pr-N database", () => {
  const report = preview({
    affected: [{ name: "@services/ib-customer-api", reason: "FileChanged" }],
    changedFiles: ["services/ib-customer-api/src/health.ts"],
  });
  assert.deepEqual(names(report), ["ib-console-api", "ib-customer-api", "ib", "ib-console"]);
  assert.equal(entry(report, "ib-customer-api").reason, "affected");
  assert.equal(entry(report, "ib-console-api").reason, "shared-d1");
  assert.equal(entry(report, "ib").reason, "paired-api");
  assert.equal(entry(report, "ib-console").reason, "shared-d1");
  assert.equal(entry(report, "ib-console-api").d1, "ib-pr-42");
  assert.equal(entry(report, "ib-customer-api").d1, "ib-pr-42");
  assert.equal(entry(report, "ib").apiBaseUrl, "https://ib-customer-api-pr-42.acct.workers.dev");
  assert.equal(entry(report, "ib-console").apiBaseUrl, "https://ib-console-api-pr-42.acct.workers.dev");
  assert.equal(names(report).includes("portfolio"), false);
  assert.equal(names(report).includes("yt-scheduler"), false);
});

test("a database used by one Worker does not pull in an unrelated target", () => {
  const lone = {
    web: {
      package: "@apps/web",
      kind: "static",
      dist: "apps/web/dist",
      slug: "web",
      routing: "history",
      api: "web-api",
    },
    "web-api": {
      package: "@services/web-api",
      kind: "cf-worker",
      d1: "web",
      contract: "@contracts/web",
    },
  };
  const report = createReport({
    targets: lone,
    event: "pull_request",
    baseRef: "main",
    prNumber: 7,
    baseSha: BASE,
    workersSubdomain: "acct",
    affected: [{ name: "@services/web-api", reason: "FileChanged" }],
  });
  assert.deepEqual(names(report), ["web-api", "web"]);
  assert.equal(entry(report, "web").reason, "paired-api");
  assert.equal(entry(report, "web").apiBaseUrl, "https://web-api-pr-7.acct.workers.dev");
  assert.equal(entry(report, "web-api").d1, "web-pr-7");
  assert.equal(entry(report, "web-api").freshDb, false);
});

test("force-all deploys every manifest target when the diff is otherwise ignored", () => {
  const report = preview({
    labels: ["force-all"],
    changedFiles: [".github/workflows/ci.yml", "deploy/targets.json"],
    affected: [],
  });
  assert.deepEqual(names(report), [
    "ib-console-api",
    "ib-customer-api",
    "ib",
    "ib-console",
    "portfolio",
    "yt-scheduler",
  ]);
  for (const item of report.deploy) assert.equal(item.reason, "force-all");
  assert.equal(entry(report, "ib-console").apiBaseUrl, "https://ib-console-api-pr-42.acct.workers.dev");
  assert.equal(entry(report, "yt-scheduler").apiBaseUrl, "https://yt-scheduler-api-dev.acct.workers.dev");
  assert.equal(entry(report, "portfolio").apiBaseUrl, null);
  assert.equal(entry(report, "ib-console-api").d1, "ib-pr-42");
  assert.equal(entry(report, "ib-console-api").freshDb, false);
  assert.equal(report.skip, null);
});

test(".github and deploy changes alone deploy nothing", () => {
  const report = preview({
    changedFiles: [".github/workflows/deploy-main.yml", "deploy/plan.mjs"],
    affected: [{ name: "@apps/portfolio", reason: "DefaultGlobalFileChanged" }],
  });
  assert.equal(report.skip, "non-deploy-paths");
  assert.deepEqual(report.deploy, []);
});

test("a workflow edit next to an app change deploys only that app", () => {
  const report = preview({
    changedFiles: [".github/workflows/ci.yml", "apps/portfolio/src/main.tsx"],
  });
  assert.deepEqual(names(report), ["portfolio"]);
  assert.equal(entry(report, "portfolio").reason, "affected");
});

test("stacked PRs get no preview, with or without force-all", () => {
  const stacked = preview({
    baseRef: "feature/parent",
    affected: [{ name: "@apps/portfolio", reason: "FileChanged" }],
  });
  assert.equal(stacked.skip, "stacked-pr");
  assert.deepEqual(stacked.deploy, []);

  const forced = preview({
    baseRef: "release/staging",
    labels: ["force-all"],
    changedFiles: ["apps/portfolio/src/main.tsx"],
  });
  assert.equal(forced.skip, "stacked-pr");
  assert.deepEqual(forced.deploy, []);
});

test("push deploys affected targets only and does not auto-rebuild a paired UI", () => {
  const report = createReport({
    targets,
    event: "push",
    ref: "main",
    workersSubdomain: "acct",
    bases: { "ib-console-api": "sha-api" },
    fallbackBase: "head-minus-one",
    affectedByBase: {
      "sha-api": [{ name: "@services/ib-console-api", reason: "FileChanged" }],
      "head-minus-one": [],
    },
  });
  assert.equal(report.env, "dev");
  assert.deepEqual(names(report), ["ib-console-api"]);
  const api = entry(report, "ib-console-api");
  assert.equal(api.path, "ib-console-api-dev");
  assert.equal(api.host, "ib-console-api-dev.acct.workers.dev");
  assert.equal(api.d1, "ib-dev");
  assert.equal(api.freshDb, false);
  assert.equal(api.base, "sha-api");
});

test("push base is the last successful deployment, so a failed deploy is retried", () => {
  const deployments = [
    { environment: "dev/portfolio", sha: "failed-sha", state: "failure" },
    { environment: "dev/portfolio", sha: "good-sha", state: "success" },
    { environment: "dev/ib-console", sha: "ib-good", state: "success" },
    { environment: "staging/portfolio", sha: "staging-sha", state: "success" },
  ];
  assert.equal(
    resolvePushBase({ deployments, env: "dev", target: "portfolio", fallbackSha: "head-minus-one" }),
    "good-sha",
  );
  assert.equal(
    resolvePushBase({ deployments, env: "dev", target: "ib", fallbackSha: "head-minus-one" }),
    "head-minus-one",
  );

  const report = createReport({
    targets,
    event: "push",
    ref: "main",
    workersSubdomain: "acct",
    bases: {
      portfolio: resolvePushBase({
        deployments,
        env: "dev",
        target: "portfolio",
        fallbackSha: "head-minus-one",
      }),
      "ib-console": resolvePushBase({
        deployments,
        env: "dev",
        target: "ib-console",
        fallbackSha: "head-minus-one",
      }),
    },
    fallbackBase: "head-minus-one",
    affectedByBase: {
      "good-sha": [{ name: "@apps/portfolio", reason: "FileChanged" }],
      "ib-good": [{ name: "@apps/innings-break-console", reason: "FileChanged" }],
      "head-minus-one": [],
    },
  });
  assert.deepEqual(names(report), ["ib-console", "portfolio"]);
  assert.equal(entry(report, "portfolio").base, "good-sha");
  assert.equal(entry(report, "portfolio").path, "/portfolio/");
  assert.equal(entry(report, "portfolio").host, "dev.yogeshkumarasamy.in");
  assert.equal(entry(report, "ib-console").base, "ib-good");
  assert.equal(entry(report, "ib-console").apiBaseUrl, "https://ib-console-api-dev.acct.workers.dev");
  assert.equal(names(report).includes("ib"), false);
});

test("GitHub deployment lookup skips a newer failure and returns the last success", async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (url.includes("/deployments?")) {
      return {
        ok: true,
        json: async () => [
          {
            sha: "failed-sha",
            statuses_url: "https://api.github.test/deployments/2/statuses",
          },
          {
            sha: "good-sha",
            statuses_url: "https://api.github.test/deployments/1/statuses",
          },
        ],
      };
    }
    if (url.endsWith("/2/statuses")) return { ok: true, json: async () => [{ state: "failure" }] };
    if (url.endsWith("/1/statuses")) return { ok: true, json: async () => [{ state: "success" }] };
    throw new Error(`unexpected ${url}`);
  };
  const sha = await githubLastSuccessfulSha({
    owner: "yogeshkumarasamy",
    repo: "workspace",
    environment: "dev/portfolio",
    token: "test-token",
    fetchImpl,
  });
  assert.equal(sha, "good-sha");
  assert.match(calls[0], /environment=dev%2Fportfolio/);
});

test("production Worker names have no env suffix; staging keeps one", () => {
  const production = createPlan({
    targets,
    event: "push",
    ref: "refs/heads/release/production",
    workersSubdomain: "acct",
    bases: { "ib-console-api": "prod-base", ib: "prod-base" },
    affectedByBase: {
      "prod-base": [
        { name: "@services/ib-console-api", reason: "FileChanged" },
        { name: "@apps/innings-break", reason: "FileChanged" },
      ],
    },
  });
  const api = production.find((item) => item.target === "ib-console-api");
  const ui = production.find((item) => item.target === "ib");
  assert.equal(api.env, "production");
  assert.equal(api.path, "ib-console-api");
  assert.equal(api.host, "ib-console-api.acct.workers.dev");
  assert.equal(api.d1, "ib-prod");
  assert.equal(ui.path, "/ib/");
  assert.equal(ui.host, "yogeshkumarasamy.in");
  assert.equal(ui.apiBaseUrl, "https://ib-customer-api.acct.workers.dev");

  const staging = createPlan({
    targets,
    event: "push",
    ref: "release/staging",
    workersSubdomain: "acct",
    affected: [{ name: "@apps/innings-break-console", reason: "FileChanged" }],
    bases: { "ib-console": "stg" },
  });
  assert.equal(staging[0].env, "staging");
  assert.equal(staging[0].path, "/ib-console/");
  assert.equal(staging[0].host, "staging.yogeshkumarasamy.in");
  assert.equal(staging[0].apiBaseUrl, "https://ib-console-api-staging.acct.workers.dev");
});

test("turbo query affected JSON selects the package that owns the build task", () => {
  const turbo = {
    data: {
      affectedTasks: {
        items: [
          {
            name: "build",
            fullName: "@apps/portfolio#build",
            package: { name: "@apps/portfolio" },
            reason: { __typename: "TaskFileChanged" },
          },
        ],
        length: 1,
      },
    },
  };
  assert.deepEqual(normalizeAffected(turbo), [{ name: "@apps/portfolio", reason: "TaskFileChanged" }]);
  const report = preview({ affected: turbo });
  assert.deepEqual(names(report), ["portfolio"]);
  assert.equal(entry(report, "portfolio").reason, "affected");
});

test("dry-run matrix.include is the plan.json array and every value is a matrix primitive", () => {
  const report = preview({
    affected: [{ name: "@apps/innings-break-console", reason: "FileChanged" }],
  });
  const matrix = toStrategyMatrix(report.deploy);
  assert.deepEqual(report.matrix, matrix);
  assert.deepEqual(matrix.include, report.deploy);
  assert.ok(matrix.include.length > 0);
  for (const item of matrix.include) {
    for (const key of ["target", "kind", "env", "base", "path", "apiBaseUrl", "reason"]) {
      assert.equal(key in item, true, key);
    }
    for (const value of Object.values(item)) assert.equal(flat(value), true);
  }
});

test("the CLI dry-run writes plan.json and prints a strategy matrix", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "plan-"));
  const out = path.join(dir, "plan.json");
  const affected = path.join(dir, "affected.json");
  const payload = {
    data: {
      affectedPackages: {
        items: [{ name: "@apps/portfolio", path: "apps/portfolio", reason: { __typename: "FileChanged" } }],
        length: 1,
      },
    },
  };
  writeFileSync(affected, JSON.stringify(payload));
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, "plan.mjs"),
      "--event",
      "pull_request",
      "--base-ref",
      "main",
      "--ref",
      "feature/portfolio-copy",
      "--pr",
      "42",
      "--base",
      BASE,
      "--workers-subdomain",
      "acct",
      "--affected-json",
      affected,
      "--dry-run",
      "--out",
      out,
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  const plan = JSON.parse(readFileSync(out, "utf8"));
  assert.deepEqual(report.matrix, { include: plan });
  assert.equal(plan[0].target, "portfolio");
  assert.equal(plan[0].path, "/previews/portfolio/pr-42/");
  assert.equal(report.build[0], "@apps/portfolio");
});

test("a preview without a PR number is refused", () => {
  assert.throws(
    () => preview({ prNumber: undefined, affected: [{ name: "@apps/portfolio", reason: "FileChanged" }] }),
    /prNumber/,
  );
});
