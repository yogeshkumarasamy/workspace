import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { CONTRACT_PACKAGE_NAME } from "../src/index";
import {
  collectMigrationFiles,
  lintMigrationFiles,
  type MigrationViolation,
} from "./lint-migrations";
import { oasdiffBreaking, type OasdiffResult } from "./oasdiff";
import { findRepoRoot, OPENAPI_RELATIVE_PATH } from "./repo-root";

export interface GateArgs {
  repoRoot: string;
  baseRef: string | null;
  baseOpenApi: string | null;
  headOpenApi: string | null;
  labels: string[];
  changedFiles: string[] | null;
  migrationDirs: string[] | null;
}

export interface GateReport {
  ok: boolean;
  breaking: boolean;
  openApiBreaking: boolean;
  migrationViolations: MigrationViolation[];
  addLabels: string[];
  ack: boolean;
  uisUpdated: boolean;
  uiRoots: string[];
  apiRoots: string[];
  oasdiff: OasdiffResult["changes"];
  summary: string;
}

export function parseArgs(
  argv: readonly string[],
  options?: { repoRoot?: string; envLabels?: string },
): GateArgs {
  const labels = (options?.envLabels ?? "")
    .split(",")
    .map((label) => label.trim())
    .filter((label) => label.length > 0);
  let repoRoot = options?.repoRoot ?? findRepoRoot(process.cwd());
  let baseRef: string | null = null;
  let baseOpenApi: string | null = null;
  let headOpenApi: string | null = null;
  let changedFiles: string[] | null = null;
  const migrationDirs: string[] = [];
  let explicitChanges = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = (): string => {
      const value = argv[index + 1];
      if (!value) throw new Error(`Missing value for ${arg}`);
      index += 1;
      return value;
    };
    switch (arg) {
      case "--base-ref":
        baseRef = next();
        break;
      case "--base-openapi":
        baseOpenApi = next();
        break;
      case "--head-openapi":
        headOpenApi = next();
        break;
      case "--label":
        labels.push(next());
        break;
      case "--ack":
        labels.push("breaking-ack");
        break;
      case "--changed-file":
        explicitChanges = true;
        changedFiles ??= [];
        changedFiles.push(next());
        break;
      case "--migrations-dir":
        migrationDirs.push(next());
        break;
      case "--repo-root":
        repoRoot = next();
        break;
      default:
        throw new Error(`Unknown argument ${arg}`);
    }
  }

  return {
    repoRoot,
    baseRef,
    baseOpenApi,
    headOpenApi,
    labels,
    changedFiles: explicitChanges ? changedFiles : null,
    migrationDirs: migrationDirs.length > 0 ? migrationDirs : null,
  };
}

export function discoverContractConsumers(repoRoot: string): {
  uiRoots: string[];
  apiRoots: string[];
} {
  const uiRoots: string[] = [];
  const apiRoots: string[] = [];
  const appsDir = path.join(repoRoot, "apps");
  if (!existsSync(appsDir)) return { uiRoots, apiRoots };
  for (const name of readdirSync(appsDir)) {
    const packagePath = path.join(appsDir, name, "package.json");
    if (!existsSync(packagePath)) continue;
    const pkg = JSON.parse(readFileSync(packagePath, "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const version =
      pkg.dependencies?.[CONTRACT_PACKAGE_NAME] ??
      pkg.devDependencies?.[CONTRACT_PACKAGE_NAME];
    if (!version) continue;
    const rel = `apps/${name}`;
    if (name.endsWith("-api")) apiRoots.push(rel);
    else uiRoots.push(rel);
  }
  uiRoots.sort();
  apiRoots.sort();
  return { uiRoots, apiRoots };
}

export function pathTouchesRoot(root: string, file: string): boolean {
  const normalizedRoot = root.replace(/\\/g, "/").replace(/\/$/, "");
  const normalizedFile = file.replace(/\\/g, "/");
  return (
    normalizedFile === normalizedRoot ||
    normalizedFile.startsWith(`${normalizedRoot}/`)
  );
}

export function decideGate(input: {
  openApiBreaking: boolean;
  migrationViolations: readonly MigrationViolation[];
  labels: readonly string[];
  changedFiles: readonly string[];
  uiRoots: readonly string[];
  apiRoots?: readonly string[];
  oasdiff?: OasdiffResult["changes"];
}): GateReport {
  const ack = input.labels.some(
    (label) => label.toLowerCase() === "breaking-ack",
  );
  const uisUpdated =
    input.uiRoots.length > 0 &&
    input.uiRoots.every((root) =>
      input.changedFiles.some((file) => pathTouchesRoot(root, file)),
    );
  const openApiWaived = !input.openApiBreaking || ack || uisUpdated;
  const migrationsWaived = input.migrationViolations.length === 0 || ack;
  const breaking =
    input.openApiBreaking || input.migrationViolations.length > 0;
  const reasons: string[] = [];
  if (input.openApiBreaking && !openApiWaived) {
    const apps = input.uiRoots.join(", ") || "(no dependent apps)";
    reasons.push(
      `OpenAPI breaking changes require label breaking-ack or edits in every affected app: ${apps}`,
    );
  }
  if (input.migrationViolations.length > 0 && !migrationsWaived) {
    reasons.push(
      `Destructive migrations require label breaking-ack (${input.migrationViolations.length} statement(s))`,
    );
  }
  let summary = "No breaking contract change";
  if (reasons.length > 0) summary = reasons.join("\n");
  else if (breaking && ack)
    summary = "Breaking change acknowledged with breaking-ack";
  else if (breaking && uisUpdated) {
    summary =
      "Breaking OpenAPI change waived because every affected app changed";
  }
  return {
    ok: openApiWaived && migrationsWaived,
    breaking,
    openApiBreaking: input.openApiBreaking,
    migrationViolations: [...input.migrationViolations],
    addLabels: breaking ? ["api-breaking"] : [],
    ack,
    uisUpdated,
    uiRoots: [...input.uiRoots],
    apiRoots: [...(input.apiRoots ?? [])],
    oasdiff: input.oasdiff ?? [],
    summary,
  };
}

function resolveBaseRef(repoRoot: string, requested: string | null): string {
  if (requested) return requested;
  for (const ref of ["origin/main", "main"]) {
    const result = spawnSync("git", ["rev-parse", "--verify", "--quiet", ref], {
      cwd: repoRoot,
    });
    if (result.status === 0) return ref;
  }
  return "HEAD";
}

function readGitFile(
  repoRoot: string,
  ref: string,
  relativePath: string,
): string | null {
  const result = spawnSync("git", ["show", `${ref}:${relativePath}`], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) return null;
  return result.stdout;
}

function changedFilesSince(repoRoot: string, baseRef: string): string[] {
  const names = new Set<string>();
  const commands = [
    ["diff", "--name-only", `${baseRef}...HEAD`],
    ["diff", "--name-only", baseRef],
    ["ls-files", "--others", "--exclude-standard"],
  ];
  for (const args of commands) {
    const result = spawnSync("git", args, { cwd: repoRoot, encoding: "utf8" });
    if (result.status !== 0) continue;
    for (const line of (result.stdout ?? "").split("\n")) {
      if (line.trim()) names.add(line.trim());
    }
  }
  return [...names].sort();
}

function compareOpenApi(
  args: GateArgs,
  baseRef: string,
): OasdiffResult & { note?: string } {
  if (args.baseOpenApi && args.headOpenApi) {
    return oasdiffBreaking(args.repoRoot, args.baseOpenApi, args.headOpenApi);
  }
  const head =
    args.headOpenApi ?? path.join(args.repoRoot, OPENAPI_RELATIVE_PATH);
  if (!existsSync(head)) {
    throw new Error(
      `Missing ${head}. Run pnpm --filter @contracts/innings-break generate`,
    );
  }
  const baseText = args.baseOpenApi
    ? null
    : readGitFile(args.repoRoot, baseRef, OPENAPI_RELATIVE_PATH);
  if (!args.baseOpenApi && baseText === null) {
    return { breaking: false, changes: [] };
  }
  const temp = mkdtempSync(path.join(tmpdir(), "ib-openapi-"));
  try {
    const baseFile = args.baseOpenApi ?? path.join(temp, "base-openapi.json");
    if (!args.baseOpenApi) writeFileSync(baseFile, baseText ?? "");
    return oasdiffBreaking(args.repoRoot, baseFile, head);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

export function runGate(args: GateArgs): GateReport {
  const baseRef = resolveBaseRef(args.repoRoot, args.baseRef);
  const compared = compareOpenApi(args, baseRef);
  const consumers = discoverContractConsumers(args.repoRoot);
  const files = collectMigrationFiles(
    args.repoRoot,
    args.migrationDirs ?? undefined,
  );
  const violations = lintMigrationFiles(files, args.repoRoot);
  const changedFiles =
    args.changedFiles ?? changedFilesSince(args.repoRoot, baseRef);
  return decideGate({
    openApiBreaking: compared.breaking,
    migrationViolations: violations,
    labels: args.labels,
    changedFiles,
    uiRoots: consumers.uiRoots,
    apiRoots: consumers.apiRoots,
    oasdiff: compared.changes,
  });
}

export function main(
  argv: readonly string[],
  options?: { envLabels?: string },
): number {
  const report = runGate(
    parseArgs(argv, {
      envLabels: options?.envLabels ?? process.env.CONTRACT_LABELS,
    }),
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) {
    process.stderr.write(`${report.summary}\n`);
    return 1;
  }
  return 0;
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("breaking-gate.ts")) {
  process.exit(main(process.argv.slice(2)));
}
