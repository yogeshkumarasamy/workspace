import { Hono } from "hono";
import { cors } from "hono/cors";
import { ConflictError, bulkAction, deleteJob, editJob, rescheduleJob } from "../../yt-scheduler/src/manage.ts";
import type { BulkAction } from "../../yt-scheduler/src/manage.ts";
import { draftJobsFromFolder } from "../../yt-scheduler/src/drive-import.ts";
import type { DriveLister } from "../../yt-scheduler/src/drive-import.ts";
import { InputError, createJob } from "../../yt-scheduler/src/jobs.ts";
import { JOB_COST, nextQuotaReset, quotaDay } from "../../yt-scheduler/src/quota.ts";
import { BulkSchema, DriveFolderImportSchema } from "../../yt-scheduler/src/schema.ts";
import { DEFAULT_RULES, nextFreeSlot } from "../../yt-scheduler/src/slots.ts";
import type { SlotRules } from "../../yt-scheduler/src/slots.ts";
import type { Store } from "../../yt-scheduler/src/store.ts";
import type { Channel, JobStatus } from "../../yt-scheduler/src/types.ts";
import type { YouTubeApi } from "../../yt-scheduler/src/youtube.ts";
import { encrypt, timingSafeEqual } from "./crypto.ts";
import type { D1Store } from "./d1-store.ts";
import { authUrl, driveFileMeta, driveMediaUrl, driveScopeValue, exchangeCode, googleIdentity, type AccessTokenPurpose, type DriveScope } from "./google.ts";
import { MOCK_MEDIA_BYTES } from "./publish.ts";
import { updateLiveSchedule } from "./upload.ts";

const MOCK_CHANNEL_ID = "UCmockchannel0001";
const PNG = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="), (c) => c.charCodeAt(0));

export interface ApiDeps {
  store: Store;
  apiKey: string;
  encryptionKey: string;
  dailyQuota: number;
  youtubeMode: "mock" | "live";
  driveScope: DriveScope;
  corsOrigin: string;
  appPublicUrl: string;
  sha: string;
  environment: string;
  google: { clientId: string; clientSecret: string; redirectUri: string } | null;
  defaultSlots?: SlotRules;
  now?: () => Date;
  startUpload: (jobId: string) => Promise<void>;
  accessTokenFor?: (channel: Channel, purpose?: AccessTokenPurpose) => Promise<string>;
}

export function createApi(deps: ApiDeps) {
  const app = new Hono();
  const slots = deps.defaultSlots ?? DEFAULT_RULES;
  const now = () => deps.now?.() ?? new Date();
  const origin = deps.appPublicUrl.endsWith("/") ? deps.appPublicUrl : `${deps.appPublicUrl}/`;

  app.use("*", cors({
    origin: (value) => (value === deps.corsOrigin || /^https?:\/\/localhost(:\d+)?$/.test(value) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(value) ? value : null),
    allowHeaders: ["content-type", "x-api-key"],
    allowMethods: ["GET", "POST", "PATCH", "OPTIONS"],
    maxAge: 86400,
  }));

  app.onError((error, c) => {
    if (error instanceof InputError) return c.json({ error: error.message, issues: error.issues }, error.message === "not found" ? 404 : 400);
    if (error instanceof ConflictError) return c.json({ error: error.message }, 409);
    console.error(error);
    return c.json({ error: error instanceof Error ? error.message : "error" }, 500);
  });

  const authed = async (c: { req: { header: (name: string) => string | undefined }; json: (body: unknown, status?: number) => Response }, next: () => Promise<void>) => {
    if (!timingSafeEqual(c.req.header("x-api-key") ?? "", deps.apiKey)) return c.json({ error: "unauthorized" }, 401);
    await next();
  };

  app.get("/api/health", (c) => c.json({ ok: true, service: "yt-scheduler-api", environment: deps.environment, youtubeMode: deps.youtubeMode, sha: deps.sha }));
  app.get("/api/config", (c) => c.json({
    audited: true,
    dailyQuota: deps.dailyQuota,
    youtubeMode: deps.youtubeMode,
    driveScope: deps.driveScope,
    publish: "public",
  }));

  app.get("/oauth/start", async (c) => {
    if (!timingSafeEqual(c.req.query("key") ?? "", deps.apiKey)) return c.text("unauthorized", 401);
    if (deps.youtubeMode === "mock") {
      await deps.store.upsertChannel({
        youtubeChannelId: MOCK_CHANNEL_ID,
        handle: "@mock",
        title: "Mock Channel",
        refreshTokenEnc: await encrypt("mock-refresh-token", deps.encryptionKey),
        googleEmail: "mock@example.com",
        driveRefreshTokenEnc: null,
        defaults: { categoryId: "1", defaultLanguage: "ta", defaultAudioLanguage: "ta", madeForKids: true },
        slots,
      });
      return c.redirect(`${origin}?connected=${encodeURIComponent("Mock Channel")}`);
    }
    if (!deps.google) return c.text("Google OAuth is not configured on this worker", 500);
    const state = crypto.randomUUID().replace(/-/g, "");
    const purpose = c.req.query("purpose") === "drive" ? "drive" : "youtube";
    await oauthStore(deps).putOauthState(state, purpose, c.req.query("channelId"));
    return c.redirect(authUrl({ clientId: deps.google.clientId, redirectUri: deps.google.redirectUri, state, purpose, drive: deps.driveScope }));
  });

  app.get("/oauth/callback", async (c) => {
    if (deps.youtubeMode === "mock") return c.redirect(`${origin}?connected=${encodeURIComponent("Mock Channel")}`);
    if (!deps.google) return c.text("Google OAuth is not configured on this worker", 500);
    const pending = await oauthStore(deps).takeOauthState(c.req.query("state") ?? "");
    if (!pending || Date.now() - new Date(pending.createdAt).getTime() > 10 * 60_000) return c.text("invalid or expired state", 400);
    const code = c.req.query("code");
    if (!code) return c.text(`oauth error: ${c.req.query("error") ?? "no code"}`, 400);
    const token = await exchangeCode({ code, clientId: deps.google.clientId, clientSecret: deps.google.clientSecret, redirectUri: deps.google.redirectUri });
    if (!token.refreshToken) return c.text("no refresh token returned; revoke the app in your Google account and connect again", 400);
    const tokenEnc = await encrypt(token.refreshToken, deps.encryptionKey);
    if (pending.purpose === "drive" && pending.channelId) {
      await deps.store.updateChannel(pending.channelId, { driveRefreshTokenEnc: tokenEnc });
      return c.redirect(`${origin}?connected=drive`);
    }
    const identity = await googleIdentity(token.accessToken);
    if (!identity.channels.length) return c.text("This Google account has no YouTube channel.", 400);
    for (const channel of identity.channels) {
      const existing = await deps.store.findChannel(channel.id);
      await deps.store.upsertChannel({
        youtubeChannelId: channel.id,
        handle: channel.handle,
        title: channel.title,
        refreshTokenEnc: tokenEnc,
        googleEmail: identity.email,
        driveRefreshTokenEnc: existing?.driveRefreshTokenEnc ?? null,
        defaults: existing?.defaults ?? { categoryId: "1", defaultLanguage: "ta", defaultAudioLanguage: "ta", madeForKids: true },
        slots: existing?.slots ?? slots,
      });
    }
    return c.redirect(`${origin}?connected=${encodeURIComponent(identity.channels.map((channel) => channel.title).join(", "))}`);
  });

  const api = new Hono();
  api.use("*", authed);
  const mdeps = () => ({
    store: deps.store,
    now,
    apiFor: (channel: Channel): YouTubeApi => youtubeApi(deps, channel),
  });

  api.get("/channels", async (c) => c.json((await deps.store.listChannels()).map(publicChannel)));
  api.patch("/channels/:id", async (c) => {
    const body = (await c.req.json()) as { defaults?: Channel["defaults"]; slots?: Partial<SlotRules> };
    const channel = await deps.store.getChannel(c.req.param("id"));
    if (!channel) return c.json({ error: "not found" }, 404);
    await deps.store.updateChannel(channel.id, {
      defaults: body.defaults ? { ...channel.defaults, ...body.defaults } : undefined,
      slots: body.slots ? { ...channel.slots, ...body.slots } : undefined,
    });
    return c.json(publicChannel((await deps.store.getChannel(channel.id))!));
  });
  api.get("/jobs", async (c) => {
    const ref = c.req.query("channel");
    const channel = ref ? await deps.store.findChannel(ref) : null;
    if (ref && !channel) return c.json({ error: "unknown channel" }, 404);
    return c.json(await deps.store.listJobs({ channelId: channel?.id, status: c.req.query("status") as JobStatus | undefined, limit: Number(c.req.query("limit") ?? 200) }));
  });
  api.get("/jobs/:id", async (c) => {
    const job = await deps.store.getJob(c.req.param("id"));
    return job ? c.json(job) : c.json({ error: "not found" }, 404);
  });
  api.post("/jobs", async (c) => {
    const body = await c.req.json();
    const bulk = BulkSchema.safeParse(body);
    if (!bulk.success) {
      const created = await createJob(body, deps.store, now());
      if (created.created) await deps.startUpload(created.job.id);
      return c.json({ created: created.created, job: created.job }, created.created ? 201 : 200);
    }
    const results = [];
    for (const raw of bulk.data.jobs) {
      try {
        const created = await createJob(raw, deps.store, now());
        if (created.created) await deps.startUpload(created.job.id);
        results.push({ ok: true, created: created.created, id: created.job.id, publishAt: created.job.publishAt });
      } catch (error) {
        results.push({ ok: false, error: error instanceof Error ? error.message : String(error), issues: (error as InputError).issues });
      }
    }
    return c.json({ results }, 207);
  });
  api.post("/jobs/:id/cancel", async (c) => {
    const job = await deps.store.getJob(c.req.param("id"));
    if (!job) return c.json({ error: "not found" }, 404);
    if (!["queued", "failed"].includes(job.status)) return c.json({ error: `cannot cancel a ${job.status} job here; delete or edit the video in YouTube Studio` }, 409);
    await deps.store.updateJob(job.id, { status: "cancelled" });
    return c.json(await deps.store.getJob(job.id));
  });
  api.post("/jobs/:id/retry", async (c) => {
    const job = await deps.store.getJob(c.req.param("id"));
    if (!job) return c.json({ error: "not found" }, 404);
    if (!["failed", "cancelled"].includes(job.status)) return c.json({ error: `job is ${job.status}` }, 409);
    await deps.store.updateJob(job.id, { status: "queued", runAt: now(), attempts: 0, lastError: null });
    await deps.startUpload(job.id);
    return c.json(await deps.store.getJob(job.id));
  });
  api.delete("/jobs/:id", async (c) => {
    await deleteJob(c.req.param("id"), mdeps());
    return c.json({ ok: true });
  });
  api.patch("/jobs/:id", async (c) => c.json(await editJob(c.req.param("id"), await c.req.json(), mdeps())));
  api.post("/jobs/:id/reschedule", async (c) => {
    const body = (await c.req.json()) as { publishAt?: string };
    if (!body.publishAt) throw new InputError("publishAt required");
    return c.json(await rescheduleJob(c.req.param("id"), new Date(body.publishAt), mdeps()));
  });
  api.post("/jobs/bulk", async (c) => {
    const body = (await c.req.json()) as BulkAction;
    if (!Array.isArray(body.ids) || !["cancel", "retry", "reschedule", "autoslot", "delete"].includes(body.action)) throw new InputError("ids[] and action required");
    const results = await bulkAction(body, mdeps());
    if (body.action === "retry") for (const result of results) if (result.ok) await deps.startUpload(result.id);
    return c.json({ results });
  });
  api.post("/drive/import", async (c) => {
    const body = await c.req.json();
    const parsed = DriveFolderImportSchema.parse(body);
    const dryRun = (body as { dryRun?: boolean }).dryRun === true;
    const channels = await deps.store.listChannels();
    const channel = parsed.channel ? await deps.store.findChannel(parsed.channel) : channels.length === 1 ? channels[0]! : null;
    if (!channel) return c.json({ error: "channel required (multiple or no channels connected)" }, 400);
    const { jobs, skipped } = await draftJobsFromFolder(driveFor(deps, channel), parsed.folderId, { channel: channel.youtubeChannelId, recursive: parsed.recursive });
    if (dryRun) return c.json({ jobs, skipped });
    const results = [];
    for (const raw of jobs) {
      try {
        const created = await createJob(raw, deps.store, now());
        if (created.created) await deps.startUpload(created.job.id);
        results.push({ ok: true, created: created.created, id: created.job.id, title: created.job.metadata.title, publishAt: created.job.publishAt });
      } catch (error) {
        results.push({ ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
    return c.json({ results, skipped });
  });
  api.get("/slots/next", async (c) => {
    const channel = await deps.store.findChannel(c.req.query("channel") ?? "");
    if (!channel) return c.json({ error: "unknown channel" }, 404);
    const type = c.req.query("type") === "short" ? "short" : "long";
    return c.json({ publishAt: nextFreeSlot(type, now(), await deps.store.takenPublishSlots(channel.id, type), channel.slots) });
  });
  api.get("/quota", async (c) => {
    const at = now();
    const used = await deps.store.quotaUsed(quotaDay(at));
    return c.json({
      day: quotaDay(at),
      limit: deps.dailyQuota,
      used: used.total,
      byChannel: used.byChannel,
      uploadsLeftToday: Math.max(0, Math.floor((deps.dailyQuota - used.total) / JOB_COST)),
      resetsAt: nextQuotaReset(at),
      note: deps.youtubeMode === "mock" ? "Mock YouTube: quota is recorded locally and nothing is uploaded." : "Quota is shared by every channel in this Google Cloud project.",
    });
  });
  api.get("/channels/:id/playlists", async (c) => c.json(await youtubeApi(deps, await channelOr404(deps, c.req.param("id"))).listPlaylists()));
  api.get("/drive/list", async (c) => {
    const channel = await channelOr404(deps, c.req.query("channel"));
    const files = await driveFor(deps, channel).list(c.req.query("folderId") || "root");
    return c.json(files.sort((a, b) => Number(b.mimeType.endsWith("folder")) - Number(a.mimeType.endsWith("folder")) || a.name.localeCompare(b.name)));
  });
  api.get("/drive/file/:fileId", async (c) => {
    await channelOr404(deps, c.req.query("channel"));
    if (deps.youtubeMode === "mock") return new Response(PNG, { headers: { "content-type": "image/png", "cache-control": "private, max-age=3600" } });
    const channel = await channelOr404(deps, c.req.query("channel"));
    const token = await tokenFor(deps, channel, "drive");
    const meta = await driveFileMeta(token, c.req.param("fileId"));
    if (!meta.mimeType.startsWith("image/")) return c.json({ error: "only images can be previewed" }, 415);
    const file = await fetch(driveMediaUrl(c.req.param("fileId")), { headers: { authorization: `Bearer ${token}` } });
    if (!file.ok || !file.body) return c.json({ error: `drive file ${file.status}` }, 502);
    return new Response(file.body, { headers: { "content-type": meta.mimeType, "cache-control": "private, max-age=3600" } });
  });
  api.get("/google/access-token", async (c) => {
    if (deps.youtubeMode === "mock") return c.json({ error: "mock mode has no Google token" }, 409);
    const channel = await channelOr404(deps, c.req.query("channel"));
    // Live drive.file and drive.readonly both need the Drive consent token. A YouTube-only token makes Google Picker return 403.
    if ((deps.driveScope === "file" || deps.driveScope === "readonly") && !channel.driveRefreshTokenEnc) {
      return c.json({ error: "Connect Drive first (Channels → Use separate Drive account). The same Google account is fine." }, 409);
    }
    return c.json({ accessToken: await tokenFor(deps, channel, "drive") });
  });
  api.post("/tick", async (c) => {
    const due = await deps.store.listJobs({ status: "queued", limit: 20 });
    const ready = due.filter((job) => job.runAt.getTime() <= now().getTime());
    for (const job of ready) await deps.startUpload(job.id);
    return c.json({ processed: ready.length });
  });

  app.route("/api", api);
  return app;
}

function oauthStore(deps: ApiDeps): D1Store {
  const store = deps.store as D1Store;
  if (typeof store.putOauthState !== "function") throw new Error("OAuth state needs the D1 store");
  return store;
}

async function channelOr404(deps: ApiDeps, ref: string | undefined) {
  const all = await deps.store.listChannels();
  const channel = ref ? await deps.store.findChannel(ref) : all.length === 1 ? all[0]! : null;
  if (!channel) throw new InputError("unknown channel");
  return channel;
}

async function tokenFor(deps: ApiDeps, channel: Channel, purpose: AccessTokenPurpose = "youtube"): Promise<string> {
  if (!deps.accessTokenFor) throw new Error("this worker has no Google token helper");
  return deps.accessTokenFor(channel, purpose);
}

function driveFor(deps: ApiDeps, channel: Channel): DriveLister {
  if (deps.youtubeMode === "mock") {
    return {
      async list() {
        return [
          { id: "mockvideo01", name: "Episode.mp4", mimeType: "video/mp4", size: String(MOCK_MEDIA_BYTES) },
          { id: "mockthumb001", name: "thumb.jpg", mimeType: "image/jpeg", size: "12000" },
          { id: "mockmeta0001", name: "metadata.json", mimeType: "application/json" },
        ];
      },
      async readText() {
        return JSON.stringify({ title: "Mock episode", type: "long" });
      },
      async download() {
        throw new Error("mock download is served by /api/drive/file");
      },
    };
  }
  return {
    async list(folderId: string) {
      const token = await tokenFor(deps, channel, "drive");
      const url = new URL("https://www.googleapis.com/drive/v3/files");
      url.searchParams.set("q", `'${folderId.replace(/'/g, "")}' in parents and trashed=false`);
      url.searchParams.set("fields", "files(id,name,mimeType,size,thumbnailLink,modifiedTime)");
      url.searchParams.set("pageSize", "200");
      url.searchParams.set("supportsAllDrives", "true");
      url.searchParams.set("includeItemsFromAllDrives", "true");
      const response = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
      const payload = (await response.json().catch(() => ({}))) as { files?: { id: string; name: string; mimeType: string; size?: string; thumbnailLink?: string; modifiedTime?: string }[]; error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message ?? `drive list ${response.status}`);
      return payload.files ?? [];
    },
    async readText(fileId: string) {
      const token = await tokenFor(deps, channel, "drive");
      const response = await fetch(driveMediaUrl(fileId), { headers: { authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error(`drive read ${response.status}`);
      return response.text();
    },
    async download() {
      throw new Error("use /api/drive/file");
    },
  };
}

function youtubeApi(deps: ApiDeps, channel: Channel): YouTubeApi {
  return {
    async open() {
      throw new Error("media is streamed by the upload workflow");
    },
    async insertVideo() {
      throw new Error("uploads run as Workflow steps");
    },
    async setThumbnail() {
      return undefined;
    },
    async resolvePlaylist(ref) {
      return ref;
    },
    async addToPlaylist() {
      return undefined;
    },
    async listPlaylists() {
      if (deps.youtubeMode === "mock") return [{ id: "PLmockplaylist01", title: "Mock playlist" }];
      const token = await tokenFor(deps, channel, "youtube");
      const response = await fetch("https://www.googleapis.com/youtube/v3/playlists?part=snippet&mine=true&maxResults=50", { headers: { authorization: `Bearer ${token}` } });
      const payload = (await response.json()) as { items?: { id?: string; snippet?: { title?: string } }[] };
      if (!response.ok) throw new Error(`playlists.list ${response.status}`);
      return (payload.items ?? []).filter((item) => item.id).map((item) => ({ id: item.id!, title: item.snippet?.title ?? item.id! }));
    },
    async updateSchedule(videoId, meta, publishAt) {
      if (deps.youtubeMode === "mock") return;
      const token = await tokenFor(deps, channel, "youtube");
      await updateLiveSchedule(token, videoId, meta, publishAt, deps.now?.() ?? new Date());
    },
  };
}

export function publicChannel(channel: Channel) {
  const { refreshTokenEnc: _refresh, driveRefreshTokenEnc, ...rest } = channel;
  void _refresh;
  return { ...rest, separateDriveAccount: !!driveRefreshTokenEnc };
}

export { driveScopeValue };
