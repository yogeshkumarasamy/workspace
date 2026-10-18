-- Innings Break shared D1 baseline. Applied once per environment
-- before either Worker deploys. Expand-only: add tables and columns
-- in later files; do not DROP or RENAME live tables or columns.

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);
