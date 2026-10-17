import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  collectMigrationFiles,
  lintMigrationFiles,
  lintSql,
} from "../scripts/lint-migrations";
import { findRepoRoot } from "../scripts/repo-root";

test("expand-only statements pass", () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, status TEXT NOT NULL);
    ALTER TABLE orders ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    CREATE INDEX IF NOT EXISTS orders_status ON orders (status);
    DROP INDEX IF EXISTS orders_status;
  `;
  assert.deepEqual(lintSql(sql), []);
});

test("drop and rename of live tables or columns fail", () => {
  const cases: Array<[string, string]> = [
    ["DROP TABLE orders;", "drop-table"],
    ["ALTER TABLE orders DROP COLUMN status;", "drop-column"],
    ["ALTER TABLE orders DROP status;", "drop-column"],
    ["ALTER TABLE orders RENAME TO archived_orders;", "rename-table"],
    ["RENAME TABLE orders TO archived_orders;", "rename-table"],
    ["ALTER TABLE orders RENAME COLUMN status TO state;", "rename-column"],
  ];
  for (const [sql, rule] of cases) {
    const violations = lintSql(sql);
    assert.equal(violations.length, 1, sql);
    assert.equal(violations[0]?.rule, rule, sql);
  }
});

test("comments and string literals do not count as destructive", () => {
  const sql = `
    -- DROP TABLE orders
    /* ALTER TABLE orders RENAME TO gone; */
    INSERT INTO notes (body) VALUES ('DROP TABLE orders');
    CREATE TABLE notes (body TEXT);
  `;
  assert.deepEqual(lintSql(sql), []);
});

test("service and contract migration trees are both linted", () => {
  const root = mkdtempSync(path.join(tmpdir(), "ib-migrations-"));
  const serviceMigration = path.join(
    root,
    "services",
    "ib-console-api",
    "migrations",
  );
  const contractMigration = path.join(
    root,
    "packages",
    "innings-break-contract",
    "migrations",
  );
  mkdirSync(serviceMigration, { recursive: true });
  mkdirSync(contractMigration, { recursive: true });
  writeFileSync(
    path.join(serviceMigration, "0002_drop.sql"),
    "DROP TABLE orders;\n",
  );
  writeFileSync(
    path.join(contractMigration, "0001_ok.sql"),
    "CREATE TABLE schema_migrations (id TEXT PRIMARY KEY);\n",
  );
  const files = collectMigrationFiles(root);
  assert.equal(files.length, 2);
  const violations = lintMigrationFiles(files, root);
  assert.equal(violations.length, 1);
  assert.equal(violations[0]?.rule, "drop-table");
  assert.match(
    violations[0]?.file ?? "",
    /services\/ib-console-api\/migrations\/0002_drop\.sql$/,
  );
});

test("committed migrations are expand-only", () => {
  const repoRoot = findRepoRoot(path.join(import.meta.dirname, ".."));
  const files = collectMigrationFiles(repoRoot);
  assert.ok(files.some((file) => file.endsWith("0001_schema_migrations.sql")));
  assert.deepEqual(lintMigrationFiles(files, repoRoot), []);
});
