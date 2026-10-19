import { Readable } from "node:stream";
import { google } from "googleapis";
import type { Metadata, Source } from "./schema.js";

export interface MediaStream { stream: Readable; mimeType?: string; name?: string }

/** Thin seam over the Google APIs so the worker can be tested with a mock. */
export interface YouTubeApi {
  open(src: Source): Promise<MediaStream>;
  insertVideo(meta: Metadata, publishAt: Date | null, media: MediaStream): Promise<string>;
  setThumbnail(videoId: string, media: MediaStream): Promise<void>;
  resolvePlaylist(ref: string, createIfMissing: boolean): Promise<string | null>;
  addToPlaylist(playlistId: string, videoId: string): Promise<void>;
  listPlaylists(): Promise<{ id: string; title: string }[]>;
  /** Change publish time of an already-uploaded (private, scheduled) video via videos.update. */
  updateSchedule(videoId: string, meta: Metadata, publishAt: Date): Promise<void>;
}

// Google rejects YouTube scopes requested together with other scopes in one
// authorization request, so each connect flow gets its own consent screen.
export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube",
  "openid",
  "email",
];

export const DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "openid",
  "email",
];

export function oauthClient(cfg: { clientId: string; clientSecret: string; redirectUri: string }) {
  return new google.auth.OAuth2(cfg.clientId, cfg.clientSecret, cfg.redirectUri);
}

export function buildVideoResource(meta: Metadata, publishAt: Date | null) {
  const future = publishAt && publishAt.getTime() > Date.now();
  let description = meta.description;
  if (meta.type === "short" && !/#shorts/i.test(meta.title + description)) description = `${description}\n\n#Shorts`.trim();
  return {
    snippet: {
      title: meta.title, description, tags: meta.tags, categoryId: meta.categoryId,
      defaultLanguage: meta.defaultLanguage, defaultAudioLanguage: meta.defaultAudioLanguage,
    },
    status: {
      // YouTube requires privacyStatus=private for publishAt scheduling.
      privacyStatus: future ? "private" : meta.privacyStatus,
      ...(future ? { publishAt: publishAt!.toISOString() } : {}),
      selfDeclaredMadeForKids: meta.madeForKids,
      containsSyntheticMedia: meta.containsSyntheticMedia,
      embeddable: true,
    },
  };
}

/** Real implementation. `ytAuth` is the channel's OAuth client; `driveAuth` may be a different account. */
export function googleYouTubeApi(ytAuth: InstanceType<typeof google.auth.OAuth2>, driveAuth = ytAuth): YouTubeApi {
  const yt = google.youtube({ version: "v3", auth: ytAuth });
  const drive = google.drive({ version: "v3", auth: driveAuth });
  return {
    async open(src) {
      if (src.kind === "drive") {
        const meta = await drive.files.get({ fileId: src.fileId, fields: "name,mimeType", supportsAllDrives: true });
        const res = await drive.files.get({ fileId: src.fileId, alt: "media", supportsAllDrives: true }, { responseType: "stream" });
        return { stream: res.data as unknown as Readable, mimeType: meta.data.mimeType ?? undefined, name: meta.data.name ?? undefined };
      }
      const res = await fetch(src.url);
      if (!res.ok || !res.body) throw Object.assign(new Error(`fetch ${src.url} -> ${res.status}`), { code: res.status });
      return { stream: Readable.fromWeb(res.body as never), mimeType: res.headers.get("content-type") ?? undefined };
    },
    async insertVideo(meta, publishAt, media) {
      // googleapis performs a resumable upload when given a stream; bytes are piped, not buffered to disk.
      const res = await yt.videos.insert({
        part: ["snippet", "status"], notifySubscribers: true,
        requestBody: buildVideoResource(meta, publishAt),
        media: { mimeType: media.mimeType ?? "video/mp4", body: media.stream },
      });
      if (!res.data.id) throw new Error("videos.insert returned no id");
      return res.data.id;
    },
    async setThumbnail(videoId, media) {
      await yt.thumbnails.set({ videoId, media: { mimeType: media.mimeType ?? "image/jpeg", body: media.stream } });
    },
    async resolvePlaylist(ref, createIfMissing) {
      if (/^(PL|UU|FL|OL)[\w-]{10,}$/.test(ref)) return ref;
      let pageToken: string | undefined;
      do {
        const res = await yt.playlists.list({ part: ["snippet"], mine: true, maxResults: 50, pageToken });
        const hit = res.data.items?.find((p) => p.snippet?.title?.trim().toLowerCase() === ref.trim().toLowerCase());
        if (hit?.id) return hit.id;
        pageToken = res.data.nextPageToken ?? undefined;
      } while (pageToken);
      if (!createIfMissing) return null;
      const created = await yt.playlists.insert({ part: ["snippet", "status"], requestBody: { snippet: { title: ref }, status: { privacyStatus: "public" } } });
      return created.data.id ?? null;
    },
    async listPlaylists() {
      const out: { id: string; title: string }[] = [];
      let pageToken: string | undefined;
      do {
        const res = await yt.playlists.list({ part: ["snippet"], mine: true, maxResults: 50, pageToken });
        for (const p of res.data.items ?? []) if (p.id) out.push({ id: p.id, title: p.snippet?.title ?? p.id });
        pageToken = res.data.nextPageToken ?? undefined;
      } while (pageToken);
      return out;
    },
    async updateSchedule(videoId, meta, publishAt) {
      // part=status replaces the whole status object, so resend the flags we own.
      await yt.videos.update({ part: ["status"], requestBody: { id: videoId, status: buildVideoResource(meta, publishAt).status } });
    },
    async addToPlaylist(playlistId, videoId) {
      await yt.playlistItems.insert({ part: ["snippet"], requestBody: { snippet: { playlistId, resourceId: { kind: "youtube#video", videoId } } } });
    },
  };
}
