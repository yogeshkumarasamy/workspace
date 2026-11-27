import { randomUUID } from "node:crypto";
import pg from "pg";
import type { Channel, Job, JobStatus } from "./types.js";

export interface Store {
  migrate(): Promise<void>;
  listChannels(): Promise<Channel[]>;
  getChannel(id: string): Promise<Channel | null>;
  /** Resolve uuid, UC id or @handle. */
  findChannel(ref: string): Promise<Channel | null>;
  upsertChannel(c: Omit<Channel, "id" | "createdAt">): Promise<Channel>;
  updateChannel(id: string, patch: Partial<Pick<Channel, "defaults" | "slots" | "driveRefreshTokenEnc">>): Promise<void>;
  insertJob(j: Omit<Job, "id" | "createdAt" | "updatedAt">): Promise<{ job: Job; created: boolean }>;
  getJob(id: string): Promise<Job | null>;
  listJobs(f: { channelId?: string; status?: JobStatus; limit?: number }): Promise<Job[]>;
  updateJob(id: string, patch: Partial<Job>): Promise<void>;
  /** Remove a job row. Does not delete the YouTube video if one was uploaded. */
  deleteJob(id: string): Promise<boolean>;
  /** Atomically claim the next due queued job. */
  claimDue(now: Date): Promise<Job | null>;
  takenPublishSlots(channelId: string, type: "short" | "long"): Promise<Date[]>;
  addQuota(channelId: string, day: string, units: number): Promise<void>;
  quotaUsed(day: string): Promise<{ total: number; byChannel: Record<string, number> }>;
}

const toLower = (s: string) => s.replace(/^@/, "").toLowerCase();

export class MemoryStore implements Store {
  channels = new Map<string, Channel>();
  jobs = new Map<string, Job>();
  quota = new Map<string, number>();
  async migrate() {}
  async listChannels() { return [...this.channels.values()]; }
  async getChannel(id: string) { return this.channels.get(id) ?? null; }
  async findChannel(ref: string) {
    return [...this.channels.values()].find((c) => c.id === ref || c.youtubeChannelId === ref || (c.handle && toLower(c.handle) === toLower(ref))) ?? null;
  }
  async upsertChannel(c: Omit<Channel, "id" | "createdAt">) {
    const existing = [...this.channels.values()].find((x) => x.youtubeChannelId === c.youtubeChannelId);
    const ch: Channel = { ...c, id: existing?.id ?? randomUUID(), createdAt: existing?.createdAt ?? new Date() };
    this.channels.set(ch.id, ch);
    return ch;
  }
  async updateChannel(id: string, patch: Partial<Channel>) { const c = this.channels.get(id); if (c) this.channels.set(id, { ...c, ...patch }); }
  async insertJob(j: Omit<Job, "id" | "createdAt" | "updatedAt">) {
    const dup = [...this.jobs.values()].find((x) => x.channelId === j.channelId && x.idempotencyKey === j.idempotencyKey);
    if (dup) return { job: dup, created: false };
    const job: Job = { ...j, id: randomUUID(), createdAt: new Date(), updatedAt: new Date() };
    this.jobs.set(job.id, job);
    return { job, created: true };
  }
  async getJob(id: string) { return this.jobs.get(id) ?? null; }
  async listJobs(f: { channelId?: string; status?: JobStatus; limit?: number }) {
    return [...this.jobs.values()].filter((j) => (!f.channelId || j.channelId === f.channelId) && (!f.status || j.status === f.status))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, f.limit ?? 200);
  }
  async updateJob(id: string, patch: Partial<Job>) { const j = this.jobs.get(id); if (j) this.jobs.set(id, { ...j, ...patch, updatedAt: new Date() }); }
  async deleteJob(id: string) { return this.jobs.delete(id); }
  async claimDue(now: Date) {
    const j = [...this.jobs.values()].filter((x) => x.status === "queued" && x.runAt <= now).sort((a, b) => a.runAt.getTime() - b.runAt.getTime())[0];
    if (!j) return null;
    await this.updateJob(j.id, { status: "uploading" });
    return this.jobs.get(j.id)!;
  }
  async takenPublishSlots(channelId: string, type: "short" | "long") {
    return [...this.jobs.values()].filter((j) => j.channelId === channelId && j.metadata.type === type && j.publishAt && j.status !== "cancelled").map((j) => j.publishAt!);
  }
  async addQuota(channelId: string, day: string, units: number) { const k = `${day}|${channelId}`; this.quota.set(k, (this.quota.get(k) ?? 0) + units); }
  async quotaUsed(day: string) {
    const byChannel: Record<string, number> = {}; let total = 0;
    for (const [k, v] of this.quota) { const [d, c] = k.split("|"); if (d === day) { byChannel[c!] = v; total += v; } }
    return { total, byChannel };
  }
}

const SQL = `
create table if not exists channels (
  id uuid primary key, youtube_channel_id text unique not null, handle text, title text not null,
  refresh_token_enc text not null, google_email text, drive_refresh_token_enc text,
  defaults jsonb not null default '{}', slots jsonb not null, created_at timestamptz not null default now());
create table if not exists jobs (
  id uuid primary key, channel_id uuid not null references channels(id), idempotency_key text not null,
  status text not null, video jsonb not null, thumbnail jsonb, metadata jsonb not null, upload_mode text not null,
  run_at timestamptz not null, publish_at timestamptz, attempts int not null default 0, last_error text,
  youtube_video_id text, warnings jsonb not null default '[]', log jsonb not null default '[]',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (channel_id, idempotency_key));
alter table jobs add column if not exists log jsonb not null default '[]';
create index if not exists jobs_due on jobs (status, run_at);
create table if not exists quota_usage (day text not null, channel_id uuid not null, units int not null default 0, primary key (day, channel_id));
`;

/* eslint-disable @typescript-eslint/no-explicit-any */
const rowToChannel = (r: any): Channel => ({ id: r.id, youtubeChannelId: r.youtube_channel_id, handle: r.handle, title: r.title, refreshTokenEnc: r.refresh_token_enc, googleEmail: r.google_email, driveRefreshTokenEnc: r.drive_refresh_token_enc, defaults: r.defaults, slots: r.slots, createdAt: r.created_at });
const rowToJob = (r: any): Job => ({ id: r.id, channelId: r.channel_id, idempotencyKey: r.idempotency_key, status: r.status, video: r.video, thumbnail: r.thumbnail, metadata: r.metadata, uploadMode: r.upload_mode, runAt: r.run_at, publishAt: r.publish_at, attempts: r.attempts, lastError: r.last_error, youtubeVideoId: r.youtube_video_id, warnings: r.warnings, log: r.log ?? [], createdAt: r.created_at, updatedAt: r.updated_at });
const jobCols: Record<string, string> = { status: "status", runAt: "run_at", publishAt: "publish_at", attempts: "attempts", lastError: "last_error", youtubeVideoId: "youtube_video_id", warnings: "warnings", metadata: "metadata", log: "log", video: "video", thumbnail: "thumbnail", uploadMode: "upload_mode" };

export class PgStore implements Store {
  pool: pg.Pool;
  constructor(url: string) { this.pool = new pg.Pool({ connectionString: url, ssl: /sslmode=require|neon|supabase/.test(url) ? { rejectUnauthorized: false } : undefined }); }
  async migrate() { await this.pool.query(SQL); }
  async listChannels() { return (await this.pool.query("select * from channels order by created_at")).rows.map(rowToChannel); }
  async getChannel(id: string) { const r = await this.pool.query("select * from channels where id::text=$1", [id]); return r.rows[0] ? rowToChannel(r.rows[0]) : null; }
  async findChannel(ref: string) {
    const r = await this.pool.query("select * from channels where id::text=$1 or youtube_channel_id=$1 or lower(ltrim(handle,'@'))=$2 limit 1", [ref, toLower(ref)]);
    return r.rows[0] ? rowToChannel(r.rows[0]) : null;
  }
  async upsertChannel(c: Omit<Channel, "id" | "createdAt">) {
    const r = await this.pool.query(
      `insert into channels (id,youtube_channel_id,handle,title,refresh_token_enc,google_email,drive_refresh_token_enc,defaults,slots)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9) on conflict (youtube_channel_id) do update set handle=excluded.handle,title=excluded.title,
       refresh_token_enc=excluded.refresh_token_enc,google_email=excluded.google_email returning *`,
      [randomUUID(), c.youtubeChannelId, c.handle, c.title, c.refreshTokenEnc, c.googleEmail, c.driveRefreshTokenEnc, c.defaults, JSON.stringify(c.slots)]);
    return rowToChannel(r.rows[0]);
  }
  async updateChannel(id: string, patch: Partial<Channel>) {
    if (patch.defaults) await this.pool.query("update channels set defaults=$2 where id=$1", [id, patch.defaults]);
    if (patch.slots) await this.pool.query("update channels set slots=$2 where id=$1", [id, JSON.stringify(patch.slots)]);
    if (patch.driveRefreshTokenEnc !== undefined) await this.pool.query("update channels set drive_refresh_token_enc=$2 where id=$1", [id, patch.driveRefreshTokenEnc]);
  }
  async insertJob(j: Omit<Job, "id" | "createdAt" | "updatedAt">) {
    const r = await this.pool.query(
      `insert into jobs (id,channel_id,idempotency_key,status,video,thumbnail,metadata,upload_mode,run_at,publish_at,attempts,warnings,log)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,$11,$12) on conflict (channel_id,idempotency_key) do nothing returning *`,
      [randomUUID(), j.channelId, j.idempotencyKey, j.status, j.video, j.thumbnail, j.metadata, j.uploadMode, j.runAt, j.publishAt, JSON.stringify(j.warnings), JSON.stringify(j.log ?? [])]);
    if (r.rows[0]) return { job: rowToJob(r.rows[0]), created: true };
    const e = await this.pool.query("select * from jobs where channel_id=$1 and idempotency_key=$2", [j.channelId, j.idempotencyKey]);
    return { job: rowToJob(e.rows[0]), created: false };
  }
  async getJob(id: string) { const r = await this.pool.query("select * from jobs where id::text=$1", [id]); return r.rows[0] ? rowToJob(r.rows[0]) : null; }
  async listJobs(f: { channelId?: string; status?: JobStatus; limit?: number }) {
    const r = await this.pool.query("select * from jobs where ($1::uuid is null or channel_id=$1) and ($2::text is null or status=$2) order by created_at desc limit $3", [f.channelId ?? null, f.status ?? null, f.limit ?? 200]);
    return r.rows.map(rowToJob);
  }
  async updateJob(id: string, patch: Partial<Job>) {
    const sets: string[] = []; const vals: unknown[] = [id];
    for (const [k, v] of Object.entries(patch)) { const col = jobCols[k]; if (!col) continue; vals.push(k === "warnings" || k === "log" ? JSON.stringify(v) : v); sets.push(`${col}=$${vals.length}`); }
    if (sets.length) await this.pool.query(`update jobs set ${sets.join(",")}, updated_at=now() where id=$1`, vals);
  }
  async deleteJob(id: string) {
    const r = await this.pool.query("delete from jobs where id::text=$1", [id]);
    return (r.rowCount ?? 0) > 0;
  }
  async claimDue(now: Date) {
    const r = await this.pool.query(`update jobs set status='uploading', updated_at=now() where id = (
      select id from jobs where status='queued' and run_at <= $1 order by run_at limit 1 for update skip locked) returning *`, [now]);
    return r.rows[0] ? rowToJob(r.rows[0]) : null;
  }
  async takenPublishSlots(channelId: string, type: "short" | "long") {
    const r = await this.pool.query("select publish_at from jobs where channel_id=$1 and metadata->>'type'=$2 and publish_at is not null and status<>'cancelled'", [channelId, type]);
    return r.rows.map((x) => x.publish_at as Date);
  }
  async addQuota(channelId: string, day: string, units: number) {
    await this.pool.query("insert into quota_usage (day,channel_id,units) values ($1,$2,$3) on conflict (day,channel_id) do update set units=quota_usage.units+excluded.units", [day, channelId, units]);
  }
  async quotaUsed(day: string) {
    const r = await this.pool.query("select channel_id, units from quota_usage where day=$1", [day]);
    const byChannel: Record<string, number> = {}; let total = 0;
    for (const x of r.rows) { byChannel[x.channel_id] = x.units; total += x.units; }
    return { total, byChannel };
  }
}
