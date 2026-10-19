/** Google OAuth + YouTube/Drive REST. No googleapis SDK: Workers have fetch. */

export const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube",
  "openid",
  "email",
];

export const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
export const DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

export type DriveScope = "file" | "readonly";

export function driveScopeValue(raw: string | undefined): DriveScope {
  return raw === "readonly" ? "readonly" : "file";
}

export type OAuthPurpose = "youtube" | "drive";

export function oauthScopes(purpose: OAuthPurpose, drive: DriveScope): string[] {
  if (purpose === "drive") {
    // Google rejects YouTube scopes requested together with other scopes in one
    // authorization request, so Drive gets its own consent screen.
    return ["openid", "email", drive === "readonly" ? DRIVE_READONLY_SCOPE : DRIVE_FILE_SCOPE];
  }
  return [...YOUTUBE_SCOPES];
}

export function authUrl(input: { clientId: string; redirectUri: string; state: string; purpose: OAuthPurpose; drive: DriveScope }): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent select_account");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("scope", oauthScopes(input.purpose, input.drive).join(" "));
  url.searchParams.set("state", input.state);
  return url.href;
}

export interface GoogleToken {
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
}

export async function exchangeCode(input: { code: string; clientId: string; clientSecret: string; redirectUri: string }): Promise<GoogleToken> {
  const body = new URLSearchParams({
    code: input.code,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
  });
  return readToken(await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body }));
}

export async function refreshAccessToken(input: { refreshToken: string; clientId: string; clientSecret: string }): Promise<GoogleToken> {
  const body = new URLSearchParams({
    refresh_token: input.refreshToken,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    grant_type: "refresh_token",
  });
  const token = await readToken(await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body }));
  return { ...token, refreshToken: token.refreshToken ?? input.refreshToken };
}

async function readToken(response: Response): Promise<GoogleToken> {
  const payload = (await response.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(`google token ${response.status}: ${payload.error_description ?? payload.error ?? "no access_token"}`);
  }
  return { accessToken: payload.access_token, refreshToken: payload.refresh_token ?? null, expiresIn: payload.expires_in ?? 3600 };
}

export interface GoogleChannel {
  id: string;
  title: string;
  handle: string | null;
}

export async function googleIdentity(accessToken: string): Promise<{ email: string | null; channels: GoogleChannel[] }> {
  const headers = { authorization: `Bearer ${accessToken}` };
  const [info, channels] = await Promise.all([
    fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers }).then((res) => res.json().catch(() => null)) as Promise<{ email?: string } | null>,
    fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers }).then((res) => res.json().catch(() => null)) as Promise<{ items?: { id?: string; snippet?: { title?: string; customUrl?: string } }[] } | null>,
  ]);
  return {
    email: info?.email ?? null,
    channels: (channels?.items ?? []).filter((item) => item.id).map((item) => ({ id: item.id!, title: item.snippet?.title ?? item.id!, handle: item.snippet?.customUrl ?? null })),
  };
}

export async function driveFileMeta(accessToken: string, fileId: string): Promise<{ name: string; mimeType: string; size: number }> {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set("fields", "name,mimeType,size");
  url.searchParams.set("supportsAllDrives", "true");
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` } });
  const payload = (await response.json().catch(() => ({}))) as { name?: string; mimeType?: string; size?: string; error?: { message?: string } };
  if (!response.ok) {
    const hint = response.status === 404 || response.status === 403
      ? " This app uses the drive.file scope. Pick the file in Google Picker (or set DRIVE_SCOPE=readonly) so Drive grants access."
      : "";
    throw new Error(`drive metadata ${response.status}: ${payload.error?.message ?? "failed"}.${hint}`);
  }
  const size = Number(payload.size ?? "0");
  if (!Number.isFinite(size) || size < 1) throw new Error(`drive file ${fileId} has no size`);
  return { name: payload.name ?? fileId, mimeType: payload.mimeType ?? "application/octet-stream", size };
}

export function driveMediaUrl(fileId: string): string {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`);
  url.searchParams.set("alt", "media");
  url.searchParams.set("supportsAllDrives", "true");
  return url.href;
}

export async function openResumableUpload(input: { accessToken: string; resource: unknown; totalBytes: number; mimeType: string }): Promise<string> {
  const response = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
    method: "POST",
    headers: {
      authorization: `Bearer ${input.accessToken}`,
      "content-type": "application/json; charset=UTF-8",
      "x-upload-content-length": String(input.totalBytes),
      "x-upload-content-type": input.mimeType,
    },
    body: JSON.stringify(input.resource),
  });
  if (!response.ok) throw new Error(`videos.insert session ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const location = response.headers.get("Location");
  if (!location) throw new Error("videos.insert returned no Location header");
  return location;
}
