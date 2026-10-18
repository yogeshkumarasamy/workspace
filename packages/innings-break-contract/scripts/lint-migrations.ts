import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { findRepoRoot } from "./repo-root";

export interface MigrationViolation {
  file: string;
  rule: string;
  message: string;
  statement: string;
}

interface LintRule {
  id: string;
  message: string;
  test: (statement: string) => boolean;
}

const RULES: readonly LintRule[] = [
  {
    id: "drop-table",
    message: "DROP TABLE is not expand-only",
    test: (statement) => /\bDROP\s+TABLE\b/i.test(statement),
  },
  {
    id: "drop-column",
    message: "DROP COLUMN is not expand-only",
    test: (statement) =>
      /\bDROP\s+COLUMN\b/i.test(statement) ||
      /\bALTER\s+TABLE\b[\s\S]*\bDROP\b/i.test(statement),
  },
  {
    id: "rename-table",
    message: "RENAME TABLE is not expand-only",
    test: (statement) =>
      /\bRENAME\s+TABLE\b/i.test(statement) ||
      /\bALTER\s+TABLE\b[\s\S]*\bRENAME\s+TO\b/i.test(statement),
  },
  {
    id: "rename-column",
    message: "RENAME COLUMN is not expand-only",
    test: (statement) =>
      /\bRENAME\s+COLUMN\b/i.test(statement) ||
      /\bALTER\s+TABLE\b[\s\S]*\bRENAME\s+COLUMN\b/i.test(statement),
  },
];

export function stripSqlNoise(sql: string): string {
  const normalized = sql.replace(/\r\n/g, "\n");
  let out = "";
  let index = 0;
  while (index < normalized.length) {
    const char = normalized[index];
    const next = normalized[index + 1];
    if (char === "-" && next === "-") {
      const newline = normalized.indexOf("\n", index);
      index = newline === -1 ? normalized.length : newline;
      out += " ";
      continue;
    }
    if (char === "/" && next === "*") {
      const end = normalized.indexOf("*/", index + 2);
      index = end === -1 ? normalized.length : end + 2;
      out += " ";
      continue;
    }
    if (char === "'" || char === '"') {
      const quote = char;
      index += 1;
      while (index < normalized.length) {
        if (normalized[index] === quote && normalized[index + 1] === quote) {
          index += 2;
          continue;
        }
        if (normalized[index] === quote) {
          index += 1;
          break;
        }
        index += 1;
      }
      out += quote === "'" ? "''" : '""';
      continue;
    }
    out += char;
    index += 1;
  }
  return out;
}

export function sqlStatements(sql: string): string[] {
  return stripSqlNoise(sql)
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

export function lintSql(sql: string, file = "<sql>"): MigrationViolation[] {
  const violations: MigrationViolation[] = [];
  for (const statement of sqlStatements(sql)) {
    const rule = RULES.find((candidate) => candidate.test(statement));
    if (!rule) continue;
    violations.push({
      file,
      rule: rule.id,
      message: rule.message,
      statement,
    });
  }
  return violations;
}

function walkSql(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSql(full, out);
    else if (entry.name.endsWith(".sql")) out.push(full);
  }
}

export function collectMigrationFiles(
  repoRoot: string,
  migrationDirs?: readonly string[],
): string[] {
  const files: string[] = [];
  if (migrationDirs) {
    for (const dir of migrationDirs) walkSql(dir, files);
    return files.sort();
  }
  const apps = path.join(repoRoot, "apps");
  if (existsSync(apps)) {
    for (const app of readdirSync(apps)) {
      walkSql(path.join(apps, app, "migrations"), files);
    }
  }
  walkSql(
    path.join(repoRoot, "packages", "innings-break-contract", "migrations"),
    files,
  );
  return files.sort();
}

export function lintMigrationFiles(
  files: readonly string[],
  repoRoot?: string,
): MigrationViolation[] {
  const violations: MigrationViolation[] = [];
  for (const file of files) {
    const sql = readFileSync(file, "utf8");
    const display = repoRoot ? path.relative(repoRoot, file) : file;
    violations.push(...lintSql(sql, display));
  }
  return violations;
}

function hasAck(argv: readonly string[]): boolean {
  if (argv.includes("--ack")) return true;
  const labels = (process.env.CONTRACT_LABELS ?? "")
    .split(",")
    .map((label) => label.trim().toLowerCase());
  return (
    labels.includes("breaking-ack") ||
    argv.some(
      (arg, index) =>
        arg === "--label" && argv[index + 1]?.toLowerCase() === "breaking-ack",
    )
  );
}

function main(argv: string[]): number {
  const repoRoot = findRepoRoot(process.cwd());
  const dirs: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--dir") {
      const dir = argv[index + 1];
      if (!dir) throw new Error("Missing value for --dir");
      dirs.push(dir);
      index += 1;
    }
  }
  const files = collectMigrationFiles(
    repoRoot,
    dirs.length > 0 ? dirs : undefined,
  );
  const violations = lintMigrationFiles(files, repoRoot);
  if (violations.length === 0) {
    console.log(`expand-only: ${files.length} migration file(s)`);
    return 0;
  }
  for (const violation of violations) {
    console.error(`${violation.file}: ${violation.message}`);
  }
  if (hasAck(argv)) {
    console.error(
      "breaking-ack is set; destructive migrations are allowed for this run",
    );
    return 0;
  }
  return 1;
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("lint-migrations.ts")) {
  process.exit(main(process.argv.slice(2)));
}
