import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { serializeOpenApiDocument } from "../src/openapi";
import { findRepoRoot, OPENAPI_RELATIVE_PATH } from "./repo-root";

export interface DriftStatus {
  ok: boolean;
  diffStatus: number;
  porcelain: string;
  stdout: string;
  stderr: string;
}

export function gitDriftStatus(
  repoRoot: string,
  relativePath: string,
): DriftStatus {
  const diff = spawnSync("git", ["diff", "--exit-code", "--", relativePath], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const status = spawnSync(
    "git",
    ["status", "--porcelain", "--", relativePath],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );
  if (diff.error) throw diff.error;
  if (status.error) throw status.error;
  const porcelain = status.stdout ?? "";
  const diffStatus = diff.status ?? 1;
  return {
    ok: diffStatus === 0 && porcelain.trim() === "",
    diffStatus,
    porcelain,
    stdout: diff.stdout ?? "",
    stderr: `${diff.stderr ?? ""}${status.stderr ?? ""}`,
  };
}

export function runContractCheck(repoRoot: string): DriftStatus {
  const relativePath = OPENAPI_RELATIVE_PATH;
  const target = path.join(repoRoot, relativePath);
  const next = serializeOpenApiDocument();
  const current = existsSync(target) ? readFileSync(target, "utf8") : "";
  if (current !== next) writeFileSync(target, next);
  return gitDriftStatus(repoRoot, relativePath);
}

function main(): number {
  const repoRoot = findRepoRoot(process.cwd());
  const drift = runContractCheck(repoRoot);
  if (drift.ok) {
    console.log(`${OPENAPI_RELATIVE_PATH} matches the generated contract`);
    return 0;
  }
  if (drift.stdout) process.stderr.write(drift.stdout);
  if (drift.stderr) process.stderr.write(drift.stderr);
  if (drift.porcelain.trim()) process.stderr.write(drift.porcelain);
  process.stderr.write(
    "openapi.json drifted. The regenerated file is in the working tree; commit it so contract:check can pass.\n",
  );
  return 1;
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("contract-check.ts")) {
  process.exit(main());
}
