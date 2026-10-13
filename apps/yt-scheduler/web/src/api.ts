export type JobStatus = "queued" | "uploading" | "processing" | "scheduled" | "published" | "failed" | "cancelled";
export type Source = { kind: "url"; url: string } | { kind: "drive"; fileId: string };
export interface Metadata {
  title: string; description: string; tags: string[]; categoryId: string; defaultLanguage: string; defaultAudioLanguage: string;
  madeForKids: boolean; containsSyntheticMedia: boolean; type: "short" | "long"; privacyStatus: "private" | "unlisted" | "public";
  publishAt?: string; playlist?: string; createPlaylistIfMissing: boolean; channel?: string;
}
export interface Job {
  id: string; channelId: string; idempotencyKey: string; status: JobStatus; video: Source; thumbnail: Source | null; metadata: Metadata;
  uploadMode: "now" | "at"; runAt: string; publishAt: string | null; attempts: number; lastError: string | null; youtubeVideoId: string | null;
  warnings: string[]; log: { at: string; msg: string }[]; createdAt: string; updatedAt: string;
}
export interface SlotRules { timezone: string; shortsTime: string; longWeekday: number; longTime: string; minLeadMinutes: number }
export interface Channel {
  id: string; youtubeChannelId: string; handle: string | null; title: string; googleEmail: string | null; separateDriveAccount: boolean;
  defaults: { categoryId?: string; defaultLanguage?: string; defaultAudioLanguage?: string; madeForKids?: boolean; shortsPlaylist?: string; longPlaylist?: string };
  slots: SlotRules;
}
export interface Quota { day: string; limit: number; used: number; byChannel: Record<string, number>; uploadsLeftToday: number; resetsAt: string; note: string }
export interface DriveFile { id: string; name: string; mimeType: string; size?: string; thumbnailLink?: string; modifiedTime?: string }

export class ApiError extends Error { constructor(msg: string, public status: number, public body: unknown) { super(msg); } }

export const getKey = () => localStorage.getItem("ytkey") ?? "";
export const setKey = (k: string) => (k ? localStorage.setItem("ytkey", k) : localStorage.removeItem("ytkey"));

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(`/api${path}`, {
    ...rest,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    headers: { "content-type": "application/json", "x-api-key": getKey(), ...(rest.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 207) {
    const issues = (body as { issues?: { path: (string | number)[]; message: string }[] }).issues;
    const detail = issues?.length ? `: ${issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}` : "";
    throw new ApiError(((body as { error?: string }).error ?? res.statusText) + detail, res.status, body);
  }
  return body as T;
}

/** Fetch an authenticated image (Drive) as an object URL. */
export async function driveImageUrl(fileId: string, channel: string): Promise<string> {
  const res = await fetch(`/api/drive/file/${fileId}?channel=${encodeURIComponent(channel)}`, { headers: { "x-api-key": getKey() } });
  if (!res.ok) throw new Error("preview failed");
  return URL.createObjectURL(await res.blob());
}

export const connectUrl = (extra = "") => `/oauth/start?key=${encodeURIComponent(getKey())}${extra}`;
