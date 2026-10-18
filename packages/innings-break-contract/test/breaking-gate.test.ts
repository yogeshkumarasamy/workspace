import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  decideGate,
  discoverContractConsumers,
  main,
  parseArgs,
  runGate,
} from "../scripts/breaking-gate";
import { oasdiffBreaking } from "../scripts/oasdiff";
import { findRepoRoot } from "../scripts/repo-root";

const fixtureDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "fixtures",
);
const repoRoot = findRepoRoot(path.join(import.meta.dirname, ".."));
const uiRoots = ["apps/innings-break", "apps/innings-break-console"];

test("a breaking OpenAPI change asks for api-breaking and fails the gate", () => {
  const report = decideGate({
    openApiBreaking: true,
    migrationViolations: [],
    labels: [],
    changedFiles: ["packages/innings-break-contract/src/schemas.ts"],
    uiRoots,
  });
  assert.equal(report.ok, false);
  assert.deepEqual(report.addLabels, ["api-breaking"]);
  assert.equal(report.uisUpdated, false);
});

test("updating both affected apps waives an OpenAPI break and still reports api-breaking", () => {
  const report = decideGate({
    openApiBreaking: true,
    migrationViolations: [],
    labels: [],
    changedFiles: [
      "apps/innings-break/src/contract.ts",
      "apps/innings-break-console/src/contract.ts",
    ],
    uiRoots,
  });
  assert.equal(report.ok, true);
  assert.equal(report.uisUpdated, true);
  assert.deepEqual(report.addLabels, ["api-breaking"]);
});

test("updating one app does not waive a break that affects both", () => {
  const report = decideGate({
    openApiBreaking: true,
    migrationViolations: [],
    labels: [],
    changedFiles: ["apps/innings-break/src/contract.ts"],
    uiRoots,
  });
  assert.equal(report.ok, false);
  assert.deepEqual(report.addLabels, ["api-breaking"]);
});

test("breaking-ack waives OpenAPI and migration breaks", () => {
  const report = decideGate({
    openApiBreaking: true,
    migrationViolations: [
      {
        file: "apps/innings-break-console-api/migrations/0002.sql",
        rule: "drop-column",
        message: "DROP COLUMN",
        statement: "ALTER TABLE orders DROP COLUMN status",
      },
    ],
    labels: ["breaking-ack"],
    changedFiles: [],
    uiRoots,
  });
  assert.equal(report.ok, true);
  assert.equal(report.ack, true);
  assert.deepEqual(report.addLabels, ["api-breaking"]);
});

test("an app edit does not waive a destructive migration", () => {
  const report = decideGate({
    openApiBreaking: false,
    migrationViolations: [
      {
        file: "apps/innings-break-console-api/migrations/0002.sql",
        rule: "drop-table",
        message: "DROP TABLE",
        statement: "DROP TABLE orders",
      },
    ],
    labels: [],
    changedFiles: uiRoots.map((root) => `${root}/src/contract.ts`),
    uiRoots,
  });
  assert.equal(report.ok, false);
  assert.deepEqual(report.addLabels, ["api-breaking"]);
});

test("an additive change adds no label", () => {
  const report = decideGate({
    openApiBreaking: false,
    migrationViolations: [],
    labels: [],
    changedFiles: [],
    uiRoots,
  });
  assert.equal(report.ok, true);
  assert.deepEqual(report.addLabels, []);
});

test("oasdiff flags a removed required field and ignores an optional addition", () => {
  const breaking = oasdiffBreaking(
    repoRoot,
    path.join(fixtureDir, "base.openapi.json"),
    path.join(fixtureDir, "breaking.openapi.json"),
  );
  assert.equal(breaking.breaking, true);
  assert.ok(
    breaking.changes.some(
      (change) => change.id === "response-required-property-removed",
    ),
  );

  const additive = oasdiffBreaking(
    repoRoot,
    path.join(fixtureDir, "base.openapi.json"),
    path.join(fixtureDir, "additive.openapi.json"),
  );
  assert.equal(additive.breaking, false);
  assert.deepEqual(additive.changes, []);
});

test("the gate cli fails a breaking spec unless breaking-ack is set", () => {
  const migrations = mkdtempSync(path.join(tmpdir(), "ib-gate-"));
  mkdirSync(migrations, { recursive: true });
  writeFileSync(
    path.join(migrations, "0001.sql"),
    "CREATE TABLE orders (id TEXT PRIMARY KEY);\n",
  );
  const shared = [
    "--base-openapi",
    path.join(fixtureDir, "base.openapi.json"),
    "--head-openapi",
    path.join(fixtureDir, "breaking.openapi.json"),
    "--migrations-dir",
    migrations,
    "--repo-root",
    repoRoot,
    "--changed-file",
    "packages/innings-break-contract/src/schemas.ts",
  ];
  assert.equal(main(shared, { envLabels: "" }), 1);
  assert.equal(
    main([...shared, "--label", "breaking-ack"], { envLabels: "" }),
    0,
  );
  assert.equal(
    main(
      [
        ...shared,
        "--changed-file",
        "apps/innings-break/src/contract.ts",
        "--changed-file",
        "apps/innings-break-console/src/contract.ts",
      ],
      { envLabels: "" },
    ),
    0,
  );
});

test("runGate treats a missing base spec as non-breaking when migrations are expand-only", () => {
  const report = runGate(
    parseArgs(
      [
        "--base-ref",
        "HEAD",
        "--migrations-dir",
        path.join(repoRoot, "packages/innings-break-contract/migrations"),
      ],
      {
        repoRoot,
        envLabels: "",
      },
    ),
  );
  assert.equal(report.migrationViolations.length, 0);
  assert.equal(report.ok, true);
});

test("both apps and both APIs depend on the contract", () => {
  const consumers = discoverContractConsumers(repoRoot);
  assert.deepEqual(consumers.uiRoots, uiRoots);
  assert.deepEqual(consumers.apiRoots, [
    "apps/innings-break-console-api",
    "apps/innings-break-customer-api",
  ]);
});
