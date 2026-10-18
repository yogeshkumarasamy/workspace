import { isQuotaError } from "../../yt-scheduler/src/backoff.ts";
import { COST, JOB_COST, canAfford, nextQuotaReset, quotaDay } from "../../yt-scheduler/src/quota.ts";
import type { Channel, Job } from "../../yt-scheduler/src/types.ts";
import type { UploadProgress } from "./d1-store.ts";
import { driveFileMeta, driveMediaUrl, openResumableUpload, refreshAccessToken } from "./google.ts";
import { MOCK_MEDIA_BYTES, videoResource } from "./publish.ts";
import { queryStatus, transferChunk, type ChunkFetcher } from "./transfer.ts";

export interface UploadStore {
  getJob(id: string): Promise<Job | null>;
  updateJob(id: string, patch: Partial<Job>): Promise<void>;
  getChannel(id: string): Promise<Channel | null>;
  addQuota(channelId: string, day: string, units: number): Promise<void>;
  quotaUsed(day: string): Promise<{ total: number; byChannel: Record<string, number> }>;
  uploadProgress(id: string): Promise<UploadProgress | null>;
  saveUpload(id: string, patch: Partial<UploadProgress> & { videoId?: string | null }): Promise<void>;
  claimJob(id: string, now: Date): Promise<boolean>;
}

export interface MockMedia {
  get(id: string): Promise<{ total: number; received: number; videoId: string | null } | null>;
  save(id: string, row: { total: number; received: number; videoId: string | null }): Promise<void>;
}

export class D1MockMedia implements MockMedia {
  constructor(private readonly db: D1Database) {}

  async get(id: string) {
    const row = await this.db.prepare("SELECT total, received, video_id FROM mock_upload WHERE id = ?").bind(id).first<{ total: number; received: number; video_id: string | null }>();
    return row ? { total: row.total, received: row.received, videoId: row.video_id } : null;
  }

  async save(id: string, row: { total: number; received: number; videoId: string | null }) {
    await this.db.prepare(
      `INSERT INTO mock_upload (id, total, received, video_id) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET total = excluded.total, received = excluded.received, video_id = excluded.video_id`,
    ).bind(id, row.total, row.received, row.videoId).run();
  }
}

export class MemoryMedia implements MockMedia {
  rows = new Map<string, { total: number; received: number; videoId: string | null }>();
  async get(id: string) { return this.rows.get(id) ?? null; }
  async save(id: string, row: { total: number; received: number; videoId: string | null }) { this.rows.set(id, row); }
}

export interface UploadEnv {
  youtubeMode: "mock" | "live";
  chunkBytes: number;
  dailyQuota: number;
  encryptionKey: string;
  google: { clientId: string; clientSecret: string } | null;
  now: () => Date;
  store: UploadStore;
  media: MockMedia;
  fetcher?: ChunkFetcher;
}

export interface MiniStep {
  do<T>(name: string, config: unknown, fn: () => Promise<T>): Promise<T>;
  sleepUntil(name: string, when: Date): Promise<void>;
}

export interface PreparedUpload {
  done: boolean;
  waitUntil: string | null;
  total: number;
  offset: number;
  chunkBytes: number;
}

const STEP = { retries: { limit: 3, delay: "5 seconds", backoff: "exponential" }, timeout: "15 minutes" };
const tokens = new Map<string, { token: string; exp: number }>();

export function immediateStep(): MiniStep {
  return {
    do: (_name, _config, fn) => fn(),
    sleepUntil: async () => undefined,
  };
}

export async function runScheduledUpload(step: MiniStep, env: UploadEnv, jobId: string): Promise<void> {
  try {
    let prepared = await step.do("prepare", STEP, () => prepareUpload(env, jobId));
    if (prepared.done) return;
    if (prepared.waitUntil && new Date(prepared.waitUntil).getTime() > env.now().getTime()) {
      await step.sleepUntil("due", new Date(prepared.waitUntil));
      prepared = await step.do("prepare-after-wait", STEP, () => prepareUpload(env, jobId));
      if (prepared.done) return;
    }
    let offset = prepared.offset;
    while (offset < prepared.total) {
      const endInclusive = Math.min(offset + prepared.chunkBytes, prepared.total) - 1;
      const outcome = await step.do(`chunk-${offset}`, STEP, () => transferJobChunk(env, jobId, offset, endInclusive));
      if (outcome.received <= offset) throw new Error(`chunk at ${offset} did not advance (received ${outcome.received})`);
      offset = outcome.received;
    }
    await step.do("finish", STEP, () => finishUpload(env, jobId));
  } catch (error) {
    await markFailed(env, jobId, error);
    throw error;
  }
}

export async function prepareUpload(env: UploadEnv, jobId: string): Promise<PreparedUpload> {
  const now = env.now();
  const job = await env.store.getJob(jobId);
  if (!job) return { done: true, waitUntil: null, total: 0, offset: 0, chunkBytes: env.chunkBytes };
  if (["cancelled", "published", "scheduled", "failed"].includes(job.status)) {
    return { done: true, waitUntil: null, total: 0, offset: 0, chunkBytes: env.chunkBytes };
  }
  const channel = await env.store.getChannel(job.channelId);
  if (!channel) {
    await env.store.updateJob(job.id, { status: "failed", lastError: "channel no longer connected" });
    return { done: true, waitUntil: null, total: 0, offset: 0, chunkBytes: env.chunkBytes };
  }
  const day = quotaDay(now);
  const used = await env.store.quotaUsed(day);
  if (!canAfford(used.total, env.dailyQuota)) {
    const reset = nextQuotaReset(now);
    await env.store.updateJob(job.id, { status: "queued", runAt: reset, lastError: `deferred: quota ${used.total}/${env.dailyQuota}` });
    return { done: false, waitUntil: reset.toISOString(), total: 0, offset: 0, chunkBytes: env.chunkBytes };
  }
  if (job.status === "queued" && job.runAt.getTime() > now.getTime()) {
    return { done: false, waitUntil: job.runAt.toISOString(), total: 0, offset: 0, chunkBytes: env.chunkBytes };
  }
  if (job.status === "queued") {
    const claimed = await env.store.claimJob(job.id, now);
    if (!claimed) return { done: true, waitUntil: null, total: 0, offset: 0, chunkBytes: env.chunkBytes };
  }

  const progress = (await env.store.uploadProgress(job.id)) ?? { sessionUri: null, offset: 0, total: null, chunkBytes: null, workflowId: null };
  const chunkBytes = progress.chunkBytes ?? env.chunkBytes;
  let total = progress.total;
  let sessionUri = progress.sessionUri;
  if (!total || !sessionUri) {
    const opened = await openSession(env, job, channel, now);
    total = opened.total;
    sessionUri = opened.sessionUri;
    await env.store.addQuota(channel.id, day, COST.videosInsert);
    await env.store.saveUpload(job.id, { sessionUri, total, offset: 0, chunkBytes });
    await env.store.updateJob(job.id, { log: [...job.log, { at: now.toISOString(), msg: `upload session opened (${total} bytes, ${chunkBytes} byte chunks)` }] });
  }
  return { done: false, waitUntil: null, total, offset: progress.sessionUri ? progress.offset : 0, chunkBytes };
}

export async function transferJobChunk(env: UploadEnv, jobId: string, offset: number, endInclusive: number): Promise<{ received: number; videoId: string | null }> {
  const job = await env.store.getJob(jobId);
  const progress = await env.store.uploadProgress(jobId);
  if (!job || !progress?.sessionUri || !progress.total) throw new Error("upload session is missing");
  if (["cancelled", "failed", "published", "scheduled"].includes(job.status)) {
    return { received: progress.total, videoId: job.youtubeVideoId };
  }
  const channel = await env.store.getChannel(job.channelId);
  if (!channel) throw new Error("channel no longer connected");
  const fetcher = fetcherFor(env);
  const headers = await sinkHeaders(env, channel);
  const status = await queryStatus(fetcher, progress.sessionUri, progress.total, headers);
  if (status.complete || status.received > endInclusive) {
    await env.store.saveUpload(jobId, { offset: status.received, videoId: status.videoId });
    return { received: status.complete ? progress.total : status.received, videoId: status.videoId };
  }
  if (status.received !== offset) return { received: status.received, videoId: status.videoId };
  const result = await transferChunk({
    fetcher,
    sourceUrl: sourceUrl(env, job),
    sinkUrl: progress.sessionUri,
    offset,
    endInclusive,
    totalSize: progress.total,
    sourceHeaders: await sourceHeaders(env, channel, job),
    sinkHeaders: headers,
  });
  await env.store.saveUpload(jobId, { offset: result.received, videoId: result.videoId });
  return { received: result.received, videoId: result.videoId };
}

export async function finishUpload(env: UploadEnv, jobId: string): Promise<void> {
  const now = env.now();
  const job = await env.store.getJob(jobId);
  if (!job) return;
  if (["published", "scheduled", "cancelled"].includes(job.status)) return;
  const progress = await env.store.uploadProgress(jobId);
  const videoId = job.youtubeVideoId ?? (env.youtubeMode === "mock" ? `mock${job.id.replace(/-/g, "").slice(0, 8)}` : null);
  if (!videoId) throw new Error("upload finished without a video id");
  const channel = await env.store.getChannel(job.channelId);
  const warnings = [...job.warnings];
  const log = [...job.log];
  if (channel && env.youtubeMode === "live" && job.thumbnail) {
    try {
      const token = await accessToken(env, channel);
      await uploadThumbnail(token, videoId, job);
      await env.store.addQuota(channel.id, quotaDay(now), COST.thumbnailsSet);
      log.push({ at: now.toISOString(), msg: "thumbnail set" });
    } catch (error) {
      warnings.push(`thumbnail failed: ${message(error)}`);
    }
  }
  if (channel && job.metadata.playlist) {
    try {
      if (env.youtubeMode === "live") {
        const token = await accessToken(env, channel);
        const playlistId = await resolvePlaylist(token, job.metadata.playlist, job.metadata.createPlaylistIfMissing);
        await env.store.addQuota(channel.id, quotaDay(now), COST.playlistsList);
        if (playlistId) {
          await addToPlaylist(token, playlistId, videoId);
          await env.store.addQuota(channel.id, quotaDay(now), COST.playlistItemsInsert);
          log.push({ at: now.toISOString(), msg: `added to playlist ${playlistId}` });
        } else warnings.push(`playlist '${job.metadata.playlist}' not found`);
      } else {
        log.push({ at: now.toISOString(), msg: `mock playlist ${job.metadata.playlist}` });
      }
    } catch (error) {
      warnings.push(`playlist failed: ${message(error)}`);
    }
  }
  const scheduled = !!job.publishAt && job.publishAt.getTime() > now.getTime();
  log.push({
    at: now.toISOString(),
    msg: scheduled
      ? `scheduled for ${job.publishAt!.toISOString()} (YouTube publishes it publicly then; privacy stays private only until publishAt)`
      : "published publicly",
  });
  await env.store.saveUpload(jobId, { offset: progress?.total ?? progress?.offset ?? 0, videoId });
  await env.store.updateJob(jobId, {
    status: scheduled ? "scheduled" : "published",
    youtubeVideoId: videoId,
    lastError: null,
    warnings,
    log,
  });
}

async function openSession(env: UploadEnv, job: Job, channel: Channel, now: Date): Promise<{ total: number; sessionUri: string }> {
  if (env.youtubeMode === "mock") {
    const total = MOCK_MEDIA_BYTES;
    await env.media.save(job.id, { total, received: 0, videoId: null });
    return { total, sessionUri: `mock://upload/${job.id}` };
  }
  const token = await accessToken(env, channel);
  const total = await liveSize(token, job);
  const mime = job.video.kind === "drive" ? (await driveFileMeta(token, job.video.fileId)).mimeType : "video/mp4";
  const sessionUri = await openResumableUpload({
    accessToken: token,
    resource: videoResource(job.metadata, job.publishAt, now),
    totalBytes: total,
    mimeType: mime.startsWith("video/") ? mime : "video/mp4",
  });
  return { total, sessionUri };
}

async function liveSize(token: string, job: Job): Promise<number> {
  if (job.video.kind === "drive") return (await driveFileMeta(token, job.video.fileId)).size;
  const head = await fetch(job.video.url, { method: "HEAD" });
  const length = Number(head.headers.get("content-length") ?? "0");
  if (head.ok && length > 0) return length;
  const probe = await fetch(job.video.url, { headers: { Range: "bytes=0-0" } });
  await probe.body?.cancel();
  const match = /\/(\d+)$/.exec(probe.headers.get("content-range") ?? "");
  if (!match) throw new Error("source URL did not advertise a size");
  return Number(match[1]);
}

function sourceUrl(env: UploadEnv, job: Job): string {
  if (env.youtubeMode === "mock") return `mock://source/${job.id}`;
  if (job.video.kind === "drive") return driveMediaUrl(job.video.fileId);
  return job.video.url;
}

async function sourceHeaders(env: UploadEnv, channel: Channel, job: Job): Promise<HeadersInit | undefined> {
  if (env.youtubeMode === "mock" || job.video.kind !== "drive") return undefined;
  return { authorization: `Bearer ${await accessToken(env, channel)}` };
}

async function sinkHeaders(env: UploadEnv, channel: Channel): Promise<HeadersInit | undefined> {
  if (env.youtubeMode === "mock") return undefined;
  return { authorization: `Bearer ${await accessToken(env, channel)}` };
}

function fetcherFor(env: UploadEnv): ChunkFetcher {
  if (env.fetcher) return env.fetcher;
  if (env.youtubeMode === "mock") return mockFetcher(env.media);
  return { fetch: (url, init) => fetch(url, init) };
}

export function mockFetcher(media: MockMedia): ChunkFetcher {
  return {
    async fetch(url, init) {
      const parsed = new URL(url);
      const id = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
      if (parsed.hostname === "source") return mockSource(init?.headers, MOCK_MEDIA_BYTES);
      if (parsed.hostname === "upload") return mockSink(media, id, init);
      throw new Error(`unknown mock url ${url}`);
    },
  };
}

function mockSource(headers: HeadersInit | undefined, total: number): Response {
  const range = new Headers(headers).get("Range") ?? "";
  const match = /^bytes=(\d+)-(\d+)$/.exec(range);
  if (!match) return new Response("range required", { status: 416 });
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (end < start || end >= total) return new Response("bad range", { status: 416 });
  const length = end - start + 1;
  return new Response(zeroStream(length), {
    status: 206,
    headers: {
      "content-range": `bytes ${start}-${end}/${total}`,
      "content-length": String(length),
      "content-type": "video/mp4",
    },
  });
}

async function mockSink(media: MockMedia, id: string, init?: RequestInit): Promise<Response> {
  const header = new Headers(init?.headers).get("Content-Range");
  const status = /^\s*bytes \*\/(\d+)\s*$/.exec(header ?? "");
  let row = await media.get(id);
  if (status) {
    const total = Number(status[1]);
    row ??= { total, received: 0, videoId: null };
    return mockStatus(row);
  }
  const bytes = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(header ?? "");
  if (!bytes) return Response.json({ error: "Content-Range required" }, { status: 400 });
  const start = Number(bytes[1]);
  const end = Number(bytes[2]);
  const total = Number(bytes[3]);
  row ??= { total, received: 0, videoId: null };
  if (start !== row.received) {
    if (start < row.received && end < row.received) return mockStatus(row);
    return Response.json({ error: `overlap at ${start}, cursor ${row.received}` }, { status: 409 });
  }
  const rawBody = init?.body;
  await discard(rawBody instanceof ReadableStream ? rawBody : null);
  const received = end + 1;
  const videoId = received >= total ? row.videoId ?? `mock${id.replace(/-/g, "").slice(0, 8)}` : row.videoId;
  const next = { total, received, videoId };
  await media.save(id, next);
  if (received >= total) return Response.json({ id: videoId, received, complete: true }, { status: 200 });
  return new Response(JSON.stringify({ received, complete: false }), { status: 308, headers: { Range: `bytes=0-${received - 1}`, "content-type": "application/json" } });
}

function mockStatus(row: { total: number; received: number; videoId: string | null }): Response {
  if (row.received >= row.total && row.videoId) return Response.json({ id: row.videoId, received: row.total, complete: true }, { status: 200 });
  if (row.received <= 0) return new Response(JSON.stringify({ received: 0 }), { status: 308, headers: { "content-type": "application/json" } });
  return new Response(JSON.stringify({ received: row.received }), { status: 308, headers: { Range: `bytes=0-${row.received - 1}`, "content-type": "application/json" } });
}

function zeroStream(length: number): ReadableStream<Uint8Array> {
  let sent = 0;
  return new ReadableStream({
    pull(controller) {
      if (sent >= length) {
        controller.close();
        return;
      }
      const size = Math.min(64 * 1024, length - sent);
      controller.enqueue(new Uint8Array(size));
      sent += size;
    },
  });
}

async function discard(body: ReadableStream | null) {
  if (!body) return;
  const reader = body.getReader();
  for (;;) {
    const { done } = await reader.read();
    if (done) return;
  }
}

async function accessToken(env: UploadEnv, channel: Channel): Promise<string> {
  if (!env.google) throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required when YOUTUBE_MODE=live");
  const hit = tokens.get(channel.id);
  if (hit && hit.exp > Date.now() + 30_000) return hit.token;
  const { decrypt } = await import("./crypto.ts");
  const refreshToken = await decrypt(channel.refreshTokenEnc, env.encryptionKey);
  const token = await refreshAccessToken({ refreshToken, clientId: env.google.clientId, clientSecret: env.google.clientSecret });
  tokens.set(channel.id, { token: token.accessToken, exp: Date.now() + token.expiresIn * 1000 });
  return token.accessToken;
}

async function uploadThumbnail(token: string, videoId: string, job: Job) {
  if (!job.thumbnail) return;
  const source = job.thumbnail.kind === "drive" ? driveMediaUrl(job.thumbnail.fileId) : job.thumbnail.url;
  const headers: HeadersInit = job.thumbnail.kind === "drive" ? { authorization: `Bearer ${token}` } : {};
  const file = await fetch(source, { headers });
  if (!file.ok) throw new Error(`thumbnail source ${file.status}`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = file.headers.get("content-type") ?? "image/jpeg";
  const boundary = `yt${crypto.randomUUID().replace(/-/g, "")}`;
  const head = `--${boundary}\r\ncontent-type: ${mime}\r\n\r\n`;
  const tail = `\r\n--${boundary}--`;
  const body = new Uint8Array(head.length + bytes.byteLength + tail.length);
  body.set(new TextEncoder().encode(head), 0);
  body.set(bytes, head.length);
  body.set(new TextEncoder().encode(tail), head.length + bytes.byteLength);
  const response = await fetch(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": `multipart/related; boundary=${boundary}` },
    body,
  });
  if (!response.ok) throw new Error(`thumbnails.set ${response.status}: ${(await response.text()).slice(0, 200)}`);
}

async function resolvePlaylist(token: string, ref: string, createIfMissing: boolean): Promise<string | null> {
  if (/^(PL|UU|FL|OL)[\w-]{10,}$/.test(ref)) return ref;
  let pageToken = "";
  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("mine", "true");
    url.searchParams.set("maxResults", "50");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    const payload = (await response.json()) as { items?: { id?: string; snippet?: { title?: string } }[]; nextPageToken?: string };
    if (!response.ok) throw new Error(`playlists.list ${response.status}`);
    const hit = payload.items?.find((item) => item.snippet?.title?.trim().toLowerCase() === ref.trim().toLowerCase());
    if (hit?.id) return hit.id;
    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);
  if (!createIfMissing) return null;
  const created = await fetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet,status", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ snippet: { title: ref }, status: { privacyStatus: "public" } }),
  });
  const body = (await created.json()) as { id?: string };
  if (!created.ok || !body.id) throw new Error(`playlists.insert ${created.status}`);
  return body.id;
}

async function addToPlaylist(token: string, playlistId: string, videoId: string) {
  const response = await fetch("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ snippet: { playlistId, resourceId: { kind: "youtube#video", videoId } } }),
  });
  if (!response.ok) throw new Error(`playlistItems.insert ${response.status}`);
}

export async function updateLiveSchedule(token: string, videoId: string, meta: Job["metadata"], publishAt: Date, now: Date) {
  const response = await fetch("https://www.googleapis.com/youtube/v3/videos?part=status", {
    method: "PUT",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ id: videoId, status: videoResource(meta, publishAt, now).status }),
  });
  if (!response.ok) throw new Error(`videos.update ${response.status}: ${(await response.text()).slice(0, 200)}`);
}

async function markFailed(env: UploadEnv, jobId: string, error: unknown) {
  const job = await env.store.getJob(jobId);
  if (!job || ["published", "scheduled", "cancelled", "failed"].includes(job.status)) return;
  const text = message(error);
  if (isQuotaError(error)) {
    await env.store.updateJob(jobId, { status: "queued", runAt: nextQuotaReset(env.now()), lastError: text, attempts: job.attempts });
    return;
  }
  await env.store.updateJob(jobId, {
    status: "failed",
    lastError: text,
    attempts: job.attempts + 1,
    log: [...job.log, { at: env.now().toISOString(), msg: `failed: ${text}` }],
  });
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export { JOB_COST };
