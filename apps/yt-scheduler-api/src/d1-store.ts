import type { Store } from "../../yt-scheduler/src/store.ts";
import type { Channel, Job, JobStatus } from "../../yt-scheduler/src/types.ts";

type ChannelRow = {
  id: string;
  youtube_channel_id: string;
  handle: string | null;
  title: string;
  refresh_token_enc: string;
  google_email: string | null;
  drive_refresh_token_enc: string | null;
  defaults: string;
  slots: string;
  created_at: string;
};

type JobRow = {
  id: string;
  channel_id: string;
  idempotency_key: string;
  status: JobStatus;
  video: string;
  thumbnail: string | null;
  metadata: string;
  upload_mode: Job["uploadMode"];
  run_at: string;
  publish_at: string | null;
  attempts: number;
  last_error: string | null;
  youtube_video_id: string | null;
  warnings: string;
  log: string;
  upload_session_uri: string | null;
  upload_offset: number;
  upload_total: number | null;
  upload_chunk_bytes: number | null;
  workflow_id: string | null;
  created_at: string;
  updated_at: string;
};

export interface UploadProgress {
  sessionUri: string | null;
  offset: number;
  total: number | null;
  chunkBytes: number | null;
  workflowId: string | null;
}

const JOB_COLS: Record<string, string> = {
  status: "status",
  runAt: "run_at",
  publishAt: "publish_at",
  attempts: "attempts",
  lastError: "last_error",
  youtubeVideoId: "youtube_video_id",
  warnings: "warnings",
  metadata: "metadata",
  log: "log",
  video: "video",
  thumbnail: "thumbnail",
  uploadMode: "upload_mode",
};

const JSON_COLS = new Set(["warnings", "metadata", "log", "video", "thumbnail"]);
const DATE_COLS = new Set(["runAt", "publishAt"]);

const toLower = (value: string) => value.replace(/^@/, "").toLowerCase();
const iso = (value: Date | null | undefined) => (value ? value.toISOString() : null);

function rowToChannel(row: ChannelRow): Channel {
  return {
    id: row.id,
    youtubeChannelId: row.youtube_channel_id,
    handle: row.handle,
    title: row.title,
    refreshTokenEnc: row.refresh_token_enc,
    googleEmail: row.google_email,
    driveRefreshTokenEnc: row.drive_refresh_token_enc,
    defaults: JSON.parse(row.defaults),
    slots: JSON.parse(row.slots),
    createdAt: new Date(row.created_at),
  };
}

function rowToJob(row: JobRow): Job {
  return {
    id: row.id,
    channelId: row.channel_id,
    idempotencyKey: row.idempotency_key,
    status: row.status,
    video: JSON.parse(row.video),
    thumbnail: row.thumbnail ? JSON.parse(row.thumbnail) : null,
    metadata: JSON.parse(row.metadata),
    uploadMode: row.upload_mode,
    runAt: new Date(row.run_at),
    publishAt: row.publish_at ? new Date(row.publish_at) : null,
    attempts: row.attempts,
    lastError: row.last_error,
    youtubeVideoId: row.youtube_video_id,
    warnings: JSON.parse(row.warnings),
    log: JSON.parse(row.log || "[]"),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class D1Store implements Store {
  constructor(private readonly db: D1Database) {}

  async migrate() {
    /* Schema is applied by ensureSchema / wrangler migrations. */
  }

  async listChannels() {
    const rows = await this.all<ChannelRow>("SELECT * FROM channels ORDER BY created_at");
    return rows.map(rowToChannel);
  }

  async getChannel(id: string) {
    const row = await this.first<ChannelRow>("SELECT * FROM channels WHERE id = ?", [id]);
    return row ? rowToChannel(row) : null;
  }

  async findChannel(ref: string) {
    const row = await this.first<ChannelRow>(
      "SELECT * FROM channels WHERE id = ? OR youtube_channel_id = ? OR lower(ltrim(handle, '@')) = ? LIMIT 1",
      [ref, ref, toLower(ref)],
    );
    return row ? rowToChannel(row) : null;
  }

  async upsertChannel(channel: Omit<Channel, "id" | "createdAt">) {
    const row = await this.first<ChannelRow>(
      `INSERT INTO channels (id, youtube_channel_id, handle, title, refresh_token_enc, google_email, drive_refresh_token_enc, defaults, slots, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(youtube_channel_id) DO UPDATE SET
         handle = excluded.handle,
         title = excluded.title,
         refresh_token_enc = excluded.refresh_token_enc,
         google_email = excluded.google_email
       RETURNING *`,
      [
        crypto.randomUUID(),
        channel.youtubeChannelId,
        channel.handle,
        channel.title,
        channel.refreshTokenEnc,
        channel.googleEmail,
        channel.driveRefreshTokenEnc,
        JSON.stringify(channel.defaults),
        JSON.stringify(channel.slots),
        new Date().toISOString(),
      ],
    );
    if (!row) throw new Error("channel upsert returned no row");
    return rowToChannel(row);
  }

  async updateChannel(id: string, patch: Partial<Pick<Channel, "defaults" | "slots" | "driveRefreshTokenEnc">>) {
    if (patch.defaults) await this.run("UPDATE channels SET defaults = ? WHERE id = ?", [JSON.stringify(patch.defaults), id]);
    if (patch.slots) await this.run("UPDATE channels SET slots = ? WHERE id = ?", [JSON.stringify(patch.slots), id]);
    if (patch.driveRefreshTokenEnc !== undefined) {
      await this.run("UPDATE channels SET drive_refresh_token_enc = ? WHERE id = ?", [patch.driveRefreshTokenEnc, id]);
    }
  }

  async insertJob(job: Omit<Job, "id" | "createdAt" | "updatedAt">) {
    const now = new Date().toISOString();
    const inserted = await this.first<JobRow>(
      `INSERT INTO jobs (id, channel_id, idempotency_key, status, video, thumbnail, metadata, upload_mode, run_at, publish_at, attempts, warnings, log, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
       ON CONFLICT(channel_id, idempotency_key) DO NOTHING
       RETURNING *`,
      [
        crypto.randomUUID(),
        job.channelId,
        job.idempotencyKey,
        job.status,
        JSON.stringify(job.video),
        job.thumbnail ? JSON.stringify(job.thumbnail) : null,
        JSON.stringify(job.metadata),
        job.uploadMode,
        iso(job.runAt),
        iso(job.publishAt),
        JSON.stringify(job.warnings),
        JSON.stringify(job.log ?? []),
        now,
        now,
      ],
    );
    if (inserted) return { job: rowToJob(inserted), created: true };
    const existing = await this.first<JobRow>("SELECT * FROM jobs WHERE channel_id = ? AND idempotency_key = ?", [job.channelId, job.idempotencyKey]);
    if (!existing) throw new Error("job insert conflict but no existing row");
    return { job: rowToJob(existing), created: false };
  }

  async getJob(id: string) {
    const row = await this.first<JobRow>("SELECT * FROM jobs WHERE id = ?", [id]);
    return row ? rowToJob(row) : null;
  }

  async listJobs(filter: { channelId?: string; status?: JobStatus; limit?: number }) {
    const rows = await this.all<JobRow>(
      "SELECT * FROM jobs WHERE (? IS NULL OR channel_id = ?) AND (? IS NULL OR status = ?) ORDER BY created_at DESC LIMIT ?",
      [filter.channelId ?? null, filter.channelId ?? null, filter.status ?? null, filter.status ?? null, filter.limit ?? 200],
    );
    return rows.map(rowToJob);
  }

  async updateJob(id: string, patch: Partial<Job>) {
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of Object.entries(patch)) {
      const column = JOB_COLS[key];
      if (!column) continue;
      let stored: unknown = value;
      if (JSON_COLS.has(key)) stored = value == null ? null : JSON.stringify(value);
      if (DATE_COLS.has(key)) stored = iso(value as Date | null);
      values.push(stored);
      sets.push(`${column} = ?`);
    }
    if (!sets.length) return;
    values.push(new Date().toISOString(), id);
    await this.run(`UPDATE jobs SET ${sets.join(", ")}, updated_at = ? WHERE id = ?`, values);
  }

  async claimJob(id: string, now: Date) {
    return (await this.run("UPDATE jobs SET status = 'uploading', updated_at = ? WHERE id = ? AND status = 'queued'", [now.toISOString(), id])) > 0;
  }

  async claimDue(now: Date) {
    const candidate = await this.first<{ id: string }>(
      "SELECT id FROM jobs WHERE status = 'queued' AND run_at <= ? ORDER BY run_at LIMIT 1",
      [now.toISOString()],
    );
    if (!candidate) return null;
    const changes = await this.run("UPDATE jobs SET status = 'uploading', updated_at = ? WHERE id = ? AND status = 'queued'", [now.toISOString(), candidate.id]);
    if (!changes) return null;
    return this.getJob(candidate.id);
  }

  async takenPublishSlots(channelId: string, type: "short" | "long") {
    const rows = await this.all<{ publish_at: string }>(
      "SELECT publish_at FROM jobs WHERE channel_id = ? AND json_extract(metadata, '$.type') = ? AND publish_at IS NOT NULL AND status <> 'cancelled'",
      [channelId, type],
    );
    return rows.map((row) => new Date(row.publish_at));
  }

  async addQuota(channelId: string, day: string, units: number) {
    await this.run(
      `INSERT INTO quota_usage (day, channel_id, units) VALUES (?, ?, ?)
       ON CONFLICT(day, channel_id) DO UPDATE SET units = units + excluded.units`,
      [day, channelId, units],
    );
  }

  async quotaUsed(day: string) {
    const rows = await this.all<{ channel_id: string; units: number }>("SELECT channel_id, units FROM quota_usage WHERE day = ?", [day]);
    const byChannel: Record<string, number> = {};
    let total = 0;
    for (const row of rows) {
      byChannel[row.channel_id] = row.units;
      total += row.units;
    }
    return { total, byChannel };
  }

  async uploadProgress(id: string): Promise<UploadProgress | null> {
    const row = await this.first<Pick<JobRow, "upload_session_uri" | "upload_offset" | "upload_total" | "upload_chunk_bytes" | "workflow_id">>(
      "SELECT upload_session_uri, upload_offset, upload_total, upload_chunk_bytes, workflow_id FROM jobs WHERE id = ?",
      [id],
    );
    if (!row) return null;
    return {
      sessionUri: row.upload_session_uri,
      offset: row.upload_offset,
      total: row.upload_total,
      chunkBytes: row.upload_chunk_bytes,
      workflowId: row.workflow_id,
    };
  }

  async saveUpload(id: string, patch: Partial<UploadProgress> & { videoId?: string | null }) {
    const sets: string[] = [];
    const values: unknown[] = [];
    if (patch.sessionUri !== undefined) {
      sets.push("upload_session_uri = ?");
      values.push(patch.sessionUri);
    }
    if (patch.offset !== undefined) {
      sets.push("upload_offset = ?");
      values.push(patch.offset);
    }
    if (patch.total !== undefined) {
      sets.push("upload_total = ?");
      values.push(patch.total);
    }
    if (patch.chunkBytes !== undefined) {
      sets.push("upload_chunk_bytes = ?");
      values.push(patch.chunkBytes);
    }
    if (patch.workflowId !== undefined) {
      sets.push("workflow_id = ?");
      values.push(patch.workflowId);
    }
    if (patch.videoId !== undefined) {
      sets.push("youtube_video_id = ?");
      values.push(patch.videoId);
    }
    if (!sets.length) return;
    values.push(new Date().toISOString(), id);
    await this.run(`UPDATE jobs SET ${sets.join(", ")}, updated_at = ? WHERE id = ?`, values);
  }

  async putOauthState(state: string, purpose: "youtube" | "drive", channelId: string | undefined) {
    await this.run("INSERT OR REPLACE INTO oauth_states (state, purpose, channel_id, created_at) VALUES (?, ?, ?, ?)", [
      state,
      purpose,
      channelId ?? null,
      new Date().toISOString(),
    ]);
  }

  async takeOauthState(state: string): Promise<{ purpose: "youtube" | "drive"; channelId: string | null; createdAt: string } | null> {
    const row = await this.first<{ purpose: "youtube" | "drive"; channel_id: string | null; created_at: string }>(
      "SELECT purpose, channel_id, created_at FROM oauth_states WHERE state = ?",
      [state],
    );
    if (!row) return null;
    await this.run("DELETE FROM oauth_states WHERE state = ?", [state]);
    return { purpose: row.purpose, channelId: row.channel_id, createdAt: row.created_at };
  }

  private async all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const result = await this.db.prepare(sql).bind(...params).all<T>();
    return result.results ?? [];
  }

  private async first<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    const row = await this.db.prepare(sql).bind(...params).first<T>();
    return row ?? null;
  }

  private async run(sql: string, params: unknown[] = []): Promise<number> {
    const result = await this.db.prepare(sql).bind(...params).run();
    return result.meta.changes ?? 0;
  }
}
