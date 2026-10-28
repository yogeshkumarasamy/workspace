import { decrypt } from "./crypto.ts";
import type { Env } from "./env.ts";
import { createApi, type ApiDeps } from "./app.ts";
import { D1Store } from "./d1-store.ts";
import { driveScopeValue, refreshAccessToken, refreshTokenEncFor } from "./google.ts";
import { parseChunkBytes } from "./publish.ts";
import { ensureSchema } from "./schema.ts";
export { UploadWorkflow } from "./workflow.ts";

const tokenCache = new Map<string, { token: string; exp: number }>();

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    await ensureSchema(env.DB);
    const store = new D1Store(env.DB);
    const live = env.YOUTUBE_MODE === "live";
    const redirectUri = env.GOOGLE_REDIRECT_URI || new URL("/oauth/callback", request.url).href;
    const deps: ApiDeps = {
      store,
      apiKey: env.API_KEY,
      encryptionKey: env.ENCRYPTION_KEY,
      dailyQuota: Number(env.DAILY_QUOTA_UNITS ?? 10000),
      youtubeMode: live ? "live" : "mock",
      driveScope: driveScopeValue(env.DRIVE_SCOPE),
      corsOrigin: env.CORS_ORIGIN,
      appPublicUrl: env.APP_PUBLIC_URL,
      sha: env.GIT_SHA ?? "dev",
      environment: env.ENVIRONMENT,
      google: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, redirectUri }
        : null,
      startUpload: async (jobId) => {
        const job = await store.getJob(jobId);
        if (!job || job.status !== "queued") return;
        const id = `upload-${jobId}-${Date.now()}`;
        await env.UPLOAD.create({ id, params: { jobId } });
        await store.saveUpload(jobId, { workflowId: id });
      },
      accessTokenFor: async (channel, purpose = "youtube") => {
        const usingDrive = purpose === "drive" && !!channel.driveRefreshTokenEnc;
        const cacheKey = `${channel.id}:${usingDrive ? "drive" : "youtube"}`;
        const hit = tokenCache.get(cacheKey);
        if (hit && hit.exp > Date.now() + 30_000) return hit.token;
        if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new Error("Google OAuth client is not configured");
        const refreshToken = await decrypt(refreshTokenEncFor(channel, purpose), env.ENCRYPTION_KEY);
        const token = await refreshAccessToken({ refreshToken, clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET });
        tokenCache.set(cacheKey, { token: token.accessToken, exp: Date.now() + token.expiresIn * 1000 });
        return token.accessToken;
      },
    };
    parseChunkBytes(env.UPLOAD_CHUNK_BYTES);
    return createApi(deps).fetch(request);
  },
};
