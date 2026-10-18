import { randomBytes, timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import type { Context, Next } from "hono";
import { encrypt } from "./crypto.js";
import type { DriveLister } from "./drive-import.js";
import { draftJobsFromFolder } from "./drive-import.js";
import { InputError, createJob } from "./jobs.js";
import { JOB_COST, quotaDay, nextQuotaReset } from "./quota.js";
import { BulkSchema, DriveFolderImportSchema } from "./schema.js";
import { nextFreeSlot } from "./slots.js";
import type { SlotRules } from "./slots.js";
import type { Store } from "./store.js";
import type { Channel, JobStatus } from "./types.js";
import { tick } from "./worker.js";
import type { WorkerDeps } from "./worker.js";
import { renderUi } from "./ui.js";
import { ConflictError, bulkAction, editJob, rescheduleJob } from "./manage.js";
import type { BulkAction } from "./manage.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

export interface OAuthPort {
  authUrl(state: string): string;
  /** Exchange code; return refresh token, email and the channels this login can manage. */
  exchange(code: string): Promise<{ refreshToken: string; email: string | null; channels: { id: string; title: string; handle: string | null }[] }>;
}

export interface AppDeps {
  store: Store;
  apiKey: string;
  encryptionKey: string;
  dailyQuota: number;
  audited: boolean;
  defaultSlots: SlotRules;
  oauth: OAuthPort;
  worker: WorkerDeps;
  driveFor(channel: Channel): DriveLister;
  /** Built SPA directory (dist/). Falls back to the minimal HTML page when absent. */
  webDir?: string;
}

/** Local Node server also mounts the static UI here so a default APP_BASE build works. */
const UI_PREFIX = "/yt-scheduler";

function withoutUiPrefix(requestPath: string): string {
  if (requestPath === UI_PREFIX) return "/";
  if (requestPath.startsWith(`${UI_PREFIX}/`)) return requestPath.slice(UI_PREFIX.length);
  return requestPath;
}

const safeEq = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

export function createApp(d: AppDeps) {
  const app = new Hono();
  const pending = new Map<string, { purpose: "youtube" | "drive"; channelId?: string; at: number }>();

  const requireKey = async (c: Context, next: Next) => {
    const k = c.req.header("x-api-key") ?? "";
    if (!safeEq(k, d.apiKey)) return c.json({ error: "unauthorized" }, 401);
    await next();
  };

  app.onError((e, c) => {
    if (e instanceof InputError) return c.json({ error: e.message, issues: e.issues }, e.message === "not found" ? 404 : 400);
    if (e instanceof ConflictError) return c.json({ error: e.message }, 409);
    console.error(e);
    return c.json({ error: e.message }, 500);
  });

  const spa = d.webDir && existsSync(join(d.webDir, "index.html")) ? readFileSync(join(d.webDir, "index.html"), "utf8") : null;
  const staticRoot = spa ? resolve(d.webDir!) : null;
  const uiHome = spa ? `${UI_PREFIX}/` : "/";
  const shell = (c: Context) => { c.header("cache-control", "no-cache"); return spa ? c.html(spa) : c.html(renderUi({ audited: d.audited })); };
  app.get("/", shell);
  const health = (c: Context) => c.json({ ok: true });
  /** Public, non-secret flags for the SPA (shown before login). */
  const config = (c: Context) => c.json({ audited: d.audited, dailyQuota: d.dailyQuota });
  app.get("/api/health", health);
  app.get("/api/config", config);
  app.get(`${UI_PREFIX}/api/health`, health);
  app.get(`${UI_PREFIX}/api/config`, config);
  if (spa && staticRoot) {
    const root = staticRoot;
    const MIME: Record<string, string> = { ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json", ".html": "text/html; charset=utf-8", ".ico": "image/x-icon", ".json": "application/json" };
    const file = (cache: (p: string) => string) => async (c: Context) => {
      const rel = withoutUiPrefix(decodeURIComponent(c.req.path));
      const p = resolve(root, `.${rel.startsWith("/") ? rel : `/${rel}`}`);
      if (!p.startsWith(root + sep)) return c.notFound();
      try {
        const body = await readFile(p);
        const headers: Record<string, string> = { "content-type": MIME[extname(p)] ?? "application/octet-stream", "cache-control": cache(p) };
        if (p.endsWith(`${sep}sw.js`)) headers["service-worker-allowed"] = c.req.path.startsWith(UI_PREFIX) ? `${UI_PREFIX}/` : "/";
        return new Response(body, { headers });
      } catch { return c.notFound(); }
    };
    // Service worker + manifest must always revalidate so updates roll out; hashed assets are immutable.
    const noCache = () => "no-cache, no-store, must-revalidate";
    const immutable = () => "public, max-age=31536000, immutable";
    for (const prefix of ["", UI_PREFIX]) {
      app.get(`${prefix}/sw.js`, file(noCache));
      app.get(`${prefix}/registerSW.js`, file(noCache));
      app.get(`${prefix}/manifest.webmanifest`, file(noCache));
      app.get(`${prefix}/assets/*`, file(immutable));
      app.get(`${prefix}/workbox-*`, file(immutable));
      app.get(`${prefix}/icons/*`, file(() => "public, max-age=604800"));
    }
    app.get(UI_PREFIX, (c) => c.redirect(`${UI_PREFIX}/`));
    app.get(`${UI_PREFIX}/`, shell);
  }


  // OAuth: browser navigation can't send headers, so the key is passed once as a query param.
  app.get("/oauth/start", (c) => {
    if (!safeEq(c.req.query("key") ?? "", d.apiKey)) return c.text("unauthorized", 401);
    const state = randomBytes(16).toString("hex");
    const purpose = c.req.query("purpose") === "drive" ? "drive" : "youtube";
    pending.set(state, { purpose, channelId: c.req.query("channelId"), at: Date.now() });
    return c.redirect(d.oauth.authUrl(state));
  });
  app.get("/oauth/callback", async (c) => {
    const st = pending.get(c.req.query("state") ?? "");
    pending.delete(c.req.query("state") ?? "");
    if (!st || Date.now() - st.at > 10 * 60_000) return c.text("invalid or expired state", 400);
    const code = c.req.query("code");
    if (!code) return c.text(`oauth error: ${c.req.query("error") ?? "no code"}`, 400);
    const r = await d.oauth.exchange(code);
    const tokenEnc = encrypt(r.refreshToken, d.encryptionKey);
    if (st.purpose === "drive" && st.channelId) {
      await d.store.updateChannel(st.channelId, { driveRefreshTokenEnc: tokenEnc });
      return c.redirect(`${uiHome}?connected=drive`);
    }
    if (!r.channels.length) return c.text("This Google account has no YouTube channel. Pick the brand account for the channel on the consent screen.", 400);
    for (const ch of r.channels) {
      const existing = await d.store.findChannel(ch.id);
      await d.store.upsertChannel({
        youtubeChannelId: ch.id, handle: ch.handle, title: ch.title, refreshTokenEnc: tokenEnc, googleEmail: r.email,
        driveRefreshTokenEnc: existing?.driveRefreshTokenEnc ?? null,
        defaults: existing?.defaults ?? { categoryId: "1", defaultLanguage: "ta", defaultAudioLanguage: "ta", madeForKids: true },
        slots: existing?.slots ?? d.defaultSlots,
      });
    }
    return c.redirect(`${uiHome}?connected=${encodeURIComponent(r.channels.map((x) => x.title).join(", "))}`);
  });
  app.get(`${UI_PREFIX}/oauth/start`, (c) => app.request(c.req.raw.url.replace(`${UI_PREFIX}/oauth/`, "/oauth/"), c.req.raw));
  app.get(`${UI_PREFIX}/oauth/callback`, (c) => app.request(c.req.raw.url.replace(`${UI_PREFIX}/oauth/`, "/oauth/"), c.req.raw));

  const api = new Hono();
  api.use("*", requireKey);

  api.get("/channels", async (c) => c.json((await d.store.listChannels()).map(publicChannel)));
  api.patch("/channels/:id", async (c) => {
    const body = (await c.req.json()) as { defaults?: Channel["defaults"]; slots?: Partial<SlotRules> };
    const ch = await d.store.getChannel(c.req.param("id"));
    if (!ch) return c.json({ error: "not found" }, 404);
    await d.store.updateChannel(ch.id, { defaults: body.defaults ? { ...ch.defaults, ...body.defaults } : undefined, slots: body.slots ? { ...ch.slots, ...body.slots } : undefined });
    return c.json(publicChannel((await d.store.getChannel(ch.id))!));
  });

  api.get("/jobs", async (c) => {
    const ref = c.req.query("channel");
    const ch = ref ? await d.store.findChannel(ref) : null;
    if (ref && !ch) return c.json({ error: "unknown channel" }, 404);
    return c.json(await d.store.listJobs({ channelId: ch?.id, status: c.req.query("status") as JobStatus | undefined, limit: Number(c.req.query("limit") ?? 200) }));
  });
  api.get("/jobs/:id", async (c) => { const j = await d.store.getJob(c.req.param("id")); return j ? c.json(j) : c.json({ error: "not found" }, 404); });

  /** Single job, or bulk {jobs:[...]}. Bulk returns per-item results. Idempotent per (channel, idempotencyKey). */
  api.post("/jobs", async (c) => {
    const body = await c.req.json();
    const bulk = BulkSchema.safeParse(body);
    if (!bulk.success) {
      const r = await createJob(body, d.store);
      return c.json({ created: r.created, job: r.job }, r.created ? 201 : 200);
    }
    const results = [];
    for (const raw of bulk.data.jobs) {
      try { const r = await createJob(raw, d.store); results.push({ ok: true, created: r.created, id: r.job.id, publishAt: r.job.publishAt }); }
      catch (e) { results.push({ ok: false, error: (e as Error).message, issues: (e as InputError).issues }); }
    }
    return c.json({ results }, 207);
  });
  api.post("/jobs/:id/cancel", async (c) => {
    const j = await d.store.getJob(c.req.param("id"));
    if (!j) return c.json({ error: "not found" }, 404);
    if (!["queued", "failed"].includes(j.status)) return c.json({ error: `cannot cancel a ${j.status} job here; delete/edit the video in YouTube Studio` }, 409);
    await d.store.updateJob(j.id, { status: "cancelled" });
    return c.json(await d.store.getJob(j.id));
  });
  api.post("/jobs/:id/retry", async (c) => {
    const j = await d.store.getJob(c.req.param("id"));
    if (!j) return c.json({ error: "not found" }, 404);
    if (!["failed", "cancelled"].includes(j.status)) return c.json({ error: `job is ${j.status}` }, 409);
    await d.store.updateJob(j.id, { status: "queued", runAt: new Date(), attempts: 0, lastError: null });
    return c.json(await d.store.getJob(j.id));
  });

  api.post("/drive/import", async (c) => {
    const body = await c.req.json();
    const p = DriveFolderImportSchema.parse(body);
    const dryRun = (body as { dryRun?: boolean }).dryRun === true;
    const channels = await d.store.listChannels();
    const ch = p.channel ? await d.store.findChannel(p.channel) : channels.length === 1 ? channels[0]! : null;
    if (!ch) return c.json({ error: "channel required (multiple or no channels connected)" }, 400);
    const { jobs, skipped } = await draftJobsFromFolder(d.driveFor(ch), p.folderId, { channel: ch.youtubeChannelId, recursive: p.recursive });
    if (dryRun) return c.json({ jobs, skipped });
    const results = [];
    for (const raw of jobs) {
      try { const r = await createJob(raw, d.store); results.push({ ok: true, created: r.created, id: r.job.id, title: r.job.metadata.title, publishAt: r.job.publishAt }); }
      catch (e) { results.push({ ok: false, error: (e as Error).message, issues: (e as InputError).issues }); }
    }
    return c.json({ results, skipped });
  });

  api.get("/slots/next", async (c) => {
    const ch = await d.store.findChannel(c.req.query("channel") ?? "");
    if (!ch) return c.json({ error: "unknown channel" }, 404);
    const type = c.req.query("type") === "short" ? "short" : "long";
    return c.json({ publishAt: nextFreeSlot(type, new Date(), await d.store.takenPublishSlots(ch.id, type), ch.slots) });
  });

  api.get("/quota", async (c) => {
    const now = new Date();
    const used = await d.store.quotaUsed(quotaDay(now));
    return c.json({ day: quotaDay(now), limit: d.dailyQuota, used: used.total, byChannel: used.byChannel, uploadsLeftToday: Math.max(0, Math.floor((d.dailyQuota - used.total) / JOB_COST)), resetsAt: nextQuotaReset(now), note: "Quota is shared by all channels in one Google Cloud project." });
  });

  const mdeps = { store: d.store, apiFor: d.worker.apiFor };
  api.patch("/jobs/:id", async (c) => c.json(await editJob(c.req.param("id"), await c.req.json(), mdeps)));
  api.post("/jobs/:id/reschedule", async (c) => {
    const b = (await c.req.json()) as { publishAt?: string };
    if (!b.publishAt) throw new InputError("publishAt required");
    return c.json(await rescheduleJob(c.req.param("id"), new Date(b.publishAt), mdeps));
  });
  api.post("/jobs/bulk", async (c) => {
    const b = (await c.req.json()) as BulkAction;
    if (!Array.isArray(b.ids) || !["cancel", "retry", "reschedule", "autoslot"].includes(b.action)) throw new InputError("ids[] and action required");
    return c.json({ results: await bulkAction(b, mdeps) });
  });

  const channelOr404 = async (ref: string | undefined) => {
    const all = await d.store.listChannels();
    const ch = ref ? await d.store.findChannel(ref) : all.length === 1 ? all[0]! : null;
    if (!ch) throw new InputError("unknown channel");
    return ch;
  };
  api.get("/channels/:id/playlists", async (c) => c.json(await d.worker.apiFor(await channelOr404(c.req.param("id"))).listPlaylists()));
  /** Drive browser for the file picker. folderId defaults to "root". */
  api.get("/drive/list", async (c) => {
    const ch = await channelOr404(c.req.query("channel"));
    const files = await d.driveFor(ch).list(c.req.query("folderId") || "root");
    return c.json(files.sort((a, b) => Number(b.mimeType.endsWith("folder")) - Number(a.mimeType.endsWith("folder")) || a.name.localeCompare(b.name)));
  });
  /** Stream a Drive file (thumbnail preview). */
  api.get("/drive/file/:fileId", async (c) => {
    const ch = await channelOr404(c.req.query("channel"));
    const f = await d.driveFor(ch).download(c.req.param("fileId"));
    if (!/^image\//.test(f.mimeType)) return c.json({ error: "only images can be previewed" }, 415);
    return new Response(Readable.toWeb(Readable.from(f.stream as AsyncIterable<Uint8Array>)) as ReadableStream, { headers: { "content-type": f.mimeType, "cache-control": "private, max-age=3600" } });
  });

  /** For external cron (e.g. if the host sleeps). */
  api.post("/tick", async (c) => c.json({ processed: await tick(d.worker) }));

  app.route("/api", api);
  app.route(`${UI_PREFIX}/api`, api);
  // Real files in the static build (app-config.json is written at deploy, next to index.html).
  if (spa && staticRoot) {
    const root = staticRoot;
    app.use("*", async (c, next) => {
      if (c.req.method !== "GET" && c.req.method !== "HEAD") return next();
      const path = c.req.path;
      if (path.startsWith("/api") || path.startsWith("/oauth") || path.startsWith(`${UI_PREFIX}/api`) || path.startsWith(`${UI_PREFIX}/oauth`)) return next();
      const rel = withoutUiPrefix(decodeURIComponent(path));
      if (!rel || rel === "/" || rel.endsWith("/")) return next();
      const filePath = resolve(root, `.${rel.startsWith("/") ? rel : `/${rel}`}`);
      if (!filePath.startsWith(root + sep) || filePath === root) return next();
      try {
        const body = await readFile(filePath);
        const name = filePath.split(sep).pop() ?? "";
        const cache = name === "app-config.json" || name === ".release.json" ? "no-cache, no-store, must-revalidate" : "public, max-age=3600";
        const type = name.endsWith(".json") ? "application/json" : "application/octet-stream";
        return new Response(body, { headers: { "content-type": type, "cache-control": cache } });
      } catch {
        return next();
      }
    });
  }
  // SPA client-side routes (history). Missing static files and API/OAuth stay real 404s.
  if (spa) app.get("*", (c) => {
    const path = c.req.path;
    if (path.startsWith("/api") || path.startsWith("/oauth") || path.startsWith(`${UI_PREFIX}/api`) || path.startsWith(`${UI_PREFIX}/oauth`)) return c.notFound();
    if (/\.(js|mjs|css|map|json|webmanifest|png|jpe?g|gif|svg|webp|avif|ico|woff2?|txt|xml)$/i.test(path)) return c.notFound();
    c.header("cache-control", "no-cache");
    return c.html(spa);
  });
  return app;
}

function publicChannel(c: Channel) {
  const { refreshTokenEnc: _r, driveRefreshTokenEnc, ...rest } = c;
  void _r;
  return { ...rest, separateDriveAccount: !!driveRefreshTokenEnc };
}
