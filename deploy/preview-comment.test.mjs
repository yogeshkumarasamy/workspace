import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

test("preview-comment CLI renders comment table from plan.json file", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "preview-comment-"));
  const planFile = path.join(dir, "plan.json");
  const outFile = path.join(dir, "comment.md");

  const samplePlan = [
    {
      target: "ib-console",
      kind: "static",
      env: "preview",
      base: "abc",
      path: "/preview/ib-console/pr-42/",
      apiBaseUrl: "https://ib-console-api-pr-42.acct.workers.dev",
      pairedWith: "preview-api",
      reason: "paired-api",
      host: "dev.yogeshkumarasamy.in",
      d1: null,
      freshDb: false,
      schemaChanged: false,
      contractCheck: false,
    },
    {
      target: "ib-console-api",
      kind: "cf-worker",
      env: "preview",
      base: "abc",
      path: "ib-console-api-pr-42",
      apiBaseUrl: null,
      pairedWith: null,
      reason: "affected",
      host: "ib-console-api-pr-42.acct.workers.dev",
      d1: "ib-pr-42",
      freshDb: false,
      schemaChanged: false,
      contractCheck: false,
    },
    {
      target: "portfolio",
      kind: "static",
      env: "preview",
      base: "abc",
      path: "/preview/portfolio/pr-42/",
      apiBaseUrl: null,
      pairedWith: null,
      reason: "affected",
      host: "dev.yogeshkumarasamy.in",
      d1: null,
      freshDb: false,
      schemaChanged: false,
      contractCheck: false,
    },
  ];

  try {
    writeFileSync(planFile, JSON.stringify(samplePlan, null, 2));

    const result = spawnSync(
      process.execPath,
      [path.join(HERE, "preview-comment.mjs"), "--plan", planFile, "--out", outFile],
      { encoding: "utf8" },
    );

    assert.equal(result.status, 0, result.stderr);
    const expectedRow1 = "| ib-console | https://dev.yogeshkumarasamy.in/preview/ib-console/pr-42/ | preview `ib-console-api-pr-42` | `ib-pr-42` |";
    const expectedRow2 = "| portfolio | https://dev.yogeshkumarasamy.in/preview/portfolio/pr-42/ | – | – |";

    const content = spawnSync("cat", [outFile], { encoding: "utf8" }).stdout;
    assert.match(content, /\| App \| Preview \| API \| DB \|/);
    assert.ok(content.includes(expectedRow1), `Expected row 1 not found: ${content}`);
    assert.ok(content.includes(expectedRow2), `Expected row 2 not found: ${content}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
