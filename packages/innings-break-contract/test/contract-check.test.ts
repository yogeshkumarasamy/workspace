import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { gitDriftStatus, runContractCheck } from "../scripts/contract-check";
import { findRepoRoot } from "../scripts/repo-root";

function git(cwd: string, args: string[]): void {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${result.stderr || result.stdout}`,
    );
  }
}

test("git diff --exit-code fails when openapi.json drifts", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ib-drift-"));
  git(dir, ["init"]);
  git(dir, ["config", "user.email", "contract-check@example.com"]);
  git(dir, ["config", "user.name", "contract-check"]);
  writeFileSync(path.join(dir, "openapi.json"), "{}\n");
  git(dir, ["add", "openapi.json"]);
  git(dir, ["commit", "-m", "add openapi"]);
  assert.equal(gitDriftStatus(dir, "openapi.json").ok, true);

  writeFileSync(path.join(dir, "openapi.json"), '{"drift":true}\n');
  const drifted = gitDriftStatus(dir, "openapi.json");
  assert.equal(drifted.ok, false);
  assert.notEqual(drifted.diffStatus, 0);
});

test("committed openapi.json matches the generator", () => {
  const repoRoot = findRepoRoot(path.join(import.meta.dirname, ".."));
  const drift = runContractCheck(repoRoot);
  assert.equal(
    drift.ok,
    true,
    `${drift.stdout}\n${drift.stderr}\n${drift.porcelain}`,
  );
});
