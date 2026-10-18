import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";
import type { Env } from "./env.ts";
import { D1Store } from "./d1-store.ts";
import { parseChunkBytes } from "./publish.ts";
import { ensureSchema } from "./schema.ts";
import { D1MockMedia, runScheduledUpload, type MiniStep, type UploadEnv } from "./upload.ts";

export type UploadParams = { jobId: string };

export async function uploadEnv(env: Env): Promise<UploadEnv> {
  await ensureSchema(env.DB);
  const live = env.YOUTUBE_MODE === "live";
  return {
    youtubeMode: live ? "live" : "mock",
    chunkBytes: parseChunkBytes(env.UPLOAD_CHUNK_BYTES),
    dailyQuota: Number(env.DAILY_QUOTA_UNITS ?? 10000),
    encryptionKey: env.ENCRYPTION_KEY,
    google: env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } : null,
    now: () => new Date(),
    store: new D1Store(env.DB),
    media: new D1MockMedia(env.DB),
  };
}

export async function runUpload(step: MiniStep, env: Env, jobId: string) {
  await runScheduledUpload(step, await uploadEnv(env), jobId);
}

export class UploadWorkflow extends WorkflowEntrypoint<Env, UploadParams> {
  async run(event: WorkflowEvent<UploadParams>, step: WorkflowStep) {
    await runUpload(step, this.env, event.payload.jobId);
  }
}
