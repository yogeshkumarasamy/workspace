import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { findRepoRoot } from "../scripts/repo-root";

const EXPECTED = [
  "@contracts/innings-break",
  "@apps/innings-break",
  "@apps/innings-break-console",
  "@apps/innings-break-console-api",
  "@apps/innings-break-customer-api",
] as const;

test(
  "a contract-only change marks both APIs and both apps via the build graph",
  { timeout: 120_000 },
  () => {
    const repoRoot = findRepoRoot(path.join(import.meta.dirname, ".."));
    const roots: Record<(typeof EXPECTED)[number], string> = {
      "@contracts/innings-break": "packages/innings-break-contract",
      "@apps/innings-break": "apps/innings-break",
      "@apps/innings-break-console": "apps/innings-break-console",
      "@apps/innings-break-console-api": "apps/innings-break-console-api",
      "@apps/innings-break-customer-api": "apps/innings-break-customer-api",
    };
    for (const name of EXPECTED) {
      if (name === "@contracts/innings-break") continue;
      const packageJson = JSON.parse(
        readFileSync(path.join(repoRoot, roots[name], "package.json"), "utf8"),
      ) as {
        dependencies?: Record<string, string>;
        scripts?: Record<string, string>;
      };
      assert.equal(
        packageJson.dependencies?.["@contracts/innings-break"],
        "workspace:*",
        name,
      );
      assert.equal(
        typeof packageJson.scripts?.build,
        "string",
        `${name} must define build so turbo --tasks build selects it`,
      );
    }

    const result = spawnSync(
      "pnpm",
      [
        "exec",
        "turbo",
        "run",
        "build",
        "--filter=...@contracts/innings-break",
        "--dry-run=json",
      ],
      { cwd: repoRoot, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const start = result.stdout.indexOf("{");
    const parsed = JSON.parse(result.stdout.slice(start)) as {
      tasks?: Array<{ package?: string; taskId?: string }>;
      packages?: string[];
    };
    assert.deepEqual(
      [...(parsed.packages ?? [])].sort(),
      [...EXPECTED].sort(),
      `turbo packages were ${JSON.stringify(parsed.packages)}`,
    );
    const taskIds = new Set((parsed.tasks ?? []).map((task) => task.taskId));
    for (const name of EXPECTED) {
      assert.ok(
        taskIds.has(`${name}#build`),
        `missing ${name}#build in ${[...taskIds].join(", ")}`,
      );
    }
  },
);
