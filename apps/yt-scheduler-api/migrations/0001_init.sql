CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  youtube_channel_id TEXT UNIQUE NOT NULL,
  handle TEXT,
  title TEXT NOT NULL,
  refresh_token_enc TEXT NOT NULL,
  google_email TEXT,
  drive_refresh_token_enc TEXT,
  defaults TEXT NOT NULL DEFAULT '{}',
  slots TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL,
  video TEXT NOT NULL,
  thumbnail TEXT,
  metadata TEXT NOT NULL,
  upload_mode TEXT NOT NULL,
  run_at TEXT NOT NULL,
  publish_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  youtube_video_id TEXT,
  warnings TEXT NOT NULL DEFAULT '[]',
  log TEXT NOT NULL DEFAULT '[]',
  upload_session_uri TEXT,
  upload_offset INTEGER NOT NULL DEFAULT 0,
  upload_total INTEGER,
  upload_chunk_bytes INTEGER,
  workflow_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (channel_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS jobs_due ON jobs (status, run_at);

CREATE TABLE IF NOT EXISTS quota_usage (
  day TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  units INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, channel_id)
);

CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  purpose TEXT NOT NULL,
  channel_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mock_upload (
  id TEXT PRIMARY KEY,
  total INTEGER NOT NULL,
  received INTEGER NOT NULL DEFAULT 0,
  video_id TEXT
);
