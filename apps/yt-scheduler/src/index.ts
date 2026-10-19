import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { google } from "googleapis";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { decrypt } from "./crypto.js";
import { PgStore } from "./store.js";
import type { Channel } from "./types.js";
import { tick } from "./worker.js";
import type { WorkerDeps } from "./worker.js";
import { DRIVE_SCOPES, YOUTUBE_SCOPES, googleYouTubeApi, oauthClient } from "./youtube.js";

const cfg = loadConfig();
const store = new PgStore(cfg.databaseUrl);
await store.migrate();
// Recover jobs interrupted by a restart mid-upload.
for (const j of await store.listJobs({ status: "uploading", limit: 1000 })) await store.updateJob(j.id, { status: "queued", runAt: new Date() });

const authFor = (refreshEnc: string) => { const a = oauthClient(cfg.google); a.setCredentials({ refresh_token: decrypt(refreshEnc, cfg.encryptionKey) }); return a; };
const driveAuth = (ch: Channel) => authFor(ch.driveRefreshTokenEnc ?? ch.refreshTokenEnc);

const worker: WorkerDeps = {
  store, dailyQuota: cfg.dailyQuota, log: (m) => console.log(m),
  apiFor: (ch) => googleYouTubeApi(authFor(ch.refreshTokenEnc), driveAuth(ch)),
};

const webDir = fileURLToPath(new URL("../dist", import.meta.url));
const app = createApp({
  webDir,
  store, apiKey: cfg.apiKey, encryptionKey: cfg.encryptionKey, dailyQuota: cfg.dailyQuota, audited: cfg.audited, defaultSlots: cfg.defaultSlots, worker,
  oauth: {
    authUrl: (state, purpose) => oauthClient(cfg.google).generateAuthUrl({ access_type: "offline", prompt: "consent select_account", scope: purpose === "drive" ? DRIVE_SCOPES : YOUTUBE_SCOPES, state, include_granted_scopes: true }),
    async exchange(code) {
      const a = oauthClient(cfg.google);
      const { tokens } = await a.getToken(code);
      if (!tokens.refresh_token) throw new Error("no refresh token returned; revoke app access in your Google account and retry");
      a.setCredentials(tokens);
      const info = await google.oauth2({ version: "v2", auth: a }).userinfo.get().catch(() => null);
      const chs = await google.youtube({ version: "v3", auth: a }).channels.list({ part: ["snippet"], mine: true }).catch(() => null);
      return {
        refreshToken: tokens.refresh_token, email: info?.data.email ?? null,
        channels: (chs?.data.items ?? []).map((c) => ({ id: c.id!, title: c.snippet?.title ?? c.id!, handle: c.snippet?.customUrl ?? null })),
      };
    },
  },
  driveFor: (ch) => {
    const drive = google.drive({ version: "v3", auth: driveAuth(ch) });
    return {
      async list(folderId) {
        const out: { id: string; name: string; mimeType: string }[] = [];
        let pageToken: string | undefined;
        do {
          const r = await drive.files.list({ q: `'${folderId.replace(/'/g, "")}' in parents and trashed=false`, fields: "nextPageToken,files(id,name,mimeType,size,thumbnailLink,modifiedTime)", pageSize: 200, pageToken, supportsAllDrives: true, includeItemsFromAllDrives: true });
          out.push(...(r.data.files ?? []).map((f) => ({ id: f.id!, name: f.name!, mimeType: f.mimeType!, size: f.size ?? undefined, thumbnailLink: f.thumbnailLink ?? undefined, modifiedTime: f.modifiedTime ?? undefined })));
          pageToken = r.data.nextPageToken ?? undefined;
        } while (pageToken);
        return out;
      },
      async download(fileId) {
        const meta = await drive.files.get({ fileId, fields: "mimeType", supportsAllDrives: true });
        const r = await drive.files.get({ fileId, alt: "media", supportsAllDrives: true }, { responseType: "stream" });
        return { stream: r.data as unknown as NodeJS.ReadableStream, mimeType: meta.data.mimeType ?? "application/octet-stream" };
      },
      async readText(fileId) {
        const r = await drive.files.get({ fileId, alt: "media", supportsAllDrives: true }, { responseType: "text" });
        return typeof r.data === "string" ? r.data : JSON.stringify(r.data);
      },
    };
  },
});

serve({ fetch: app.fetch, port: cfg.port }, () => console.log(`yt-scheduler on :${cfg.port}`));

let busy = false;
setInterval(async () => {
  if (busy) return;
  busy = true;
  try { await tick(worker); } catch (e) { console.error("tick failed", e); } finally { busy = false; }
}, cfg.tickSeconds * 1000);
