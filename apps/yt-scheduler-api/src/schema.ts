import migrationSql from "../migrations/0001_init.sql";

const ready = new WeakMap<D1Database, Promise<void>>();

/** Local D1 runs `exec` per line, so a multi-line statement arrives incomplete. */
export function schemaStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((part) => part.replace(/--[^\n]*/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** Apply the D1 schema once per isolate. The same file is what `wrangler d1 migrations apply` runs. */
export function ensureSchema(db: D1Database): Promise<void> {
  let pending = ready.get(db);
  if (!pending) {
    pending = (async () => {
      for (const statement of schemaStatements(migrationSql)) await db.exec(statement);
    })().then(
      () => undefined,
      (error) => {
        ready.delete(db);
        throw error;
      },
    );
    ready.set(db, pending);
  }
  return pending;
}

export { migrationSql };
