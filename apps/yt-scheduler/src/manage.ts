import { InputError } from "./jobs.js";
import { COST, quotaDay } from "./quota.js";
import { JobInputSchema } from "./schema.js";
import { nextFreeSlot } from "./slots.js";
import type { Store } from "./store.js";
import type { Job } from "./types.js";
import type { YouTubeApi } from "./youtube.js";
import type { Channel } from "./types.js";

export interface ManageDeps { store: Store; apiFor(channel: Channel): YouTubeApi; now?: () => Date }

export class ConflictError extends Error {}

const EDITABLE = ["queued", "failed", "cancelled"];
const entry = (msg: string, now: Date) => ({ at: now.toISOString(), msg });

/** Edit a not-yet-uploaded job. Re-validates the full job. */
export async function editJob(id: string, patch: Record<string, unknown>, d: ManageDeps): Promise<Job> {
  const now = d.now?.() ?? new Date();
  const job = await d.store.getJob(id);
  if (!job) throw new InputError("not found");
  if (!EDITABLE.includes(job.status)) {
    const keys = Object.keys(patch);
    const onlyTime = keys.every((k) => k === "metadata") && Object.keys((patch.metadata ?? {}) as object).every((k) => k === "publishAt");
    if (onlyTime && (patch.metadata as { publishAt?: string })?.publishAt) return rescheduleJob(id, new Date((patch.metadata as { publishAt: string }).publishAt), d);
    throw new ConflictError(`job is ${job.status}; only publishAt can change after upload`);
  }
  const toRaw = (s: Job["video"]) => (s.kind === "drive" ? { driveFileId: s.fileId } : { url: s.url });
  const merged = {
    idempotencyKey: job.idempotencyKey,
    channel: job.metadata.channel,
    video: patch.video ?? toRaw(job.video),
    thumbnail: patch.thumbnail === null ? undefined : (patch.thumbnail ?? (job.thumbnail ? toRaw(job.thumbnail) : undefined)),
    metadata: { ...job.metadata, ...((patch.metadata as object) ?? {}) },
    uploadMode: patch.uploadMode ?? job.uploadMode,
    uploadAt: patch.uploadAt ?? (job.uploadMode === "at" ? job.runAt.toISOString() : undefined),
  };
  const p = JobInputSchema.safeParse(merged);
  if (!p.success) throw new InputError("invalid job", p.error.issues);
  const publishAt = p.data.metadata.publishAt ? new Date(p.data.metadata.publishAt) : null;
  const runAt = p.data.uploadMode === "at" ? new Date(p.data.uploadAt!) : now;
  if (publishAt && runAt > publishAt) throw new InputError("uploadAt must be before publishAt");
  await d.store.updateJob(id, {
    video: p.data.video, thumbnail: p.data.thumbnail ?? null, metadata: { ...p.data.metadata, channel: job.metadata.channel },
    uploadMode: p.data.uploadMode, runAt: job.status === "queued" ? runAt : job.runAt, publishAt,
    log: [...job.log, entry("edited", now)],
  });
  return (await d.store.getJob(id))!;
}

/** Move a publish time. Uploaded+scheduled videos are updated on YouTube via videos.update. */
export async function rescheduleJob(id: string, publishAt: Date, d: ManageDeps): Promise<Job> {
  const now = d.now?.() ?? new Date();
  if (isNaN(publishAt.getTime())) throw new InputError("invalid publishAt");
  const job = await d.store.getJob(id);
  if (!job) throw new InputError("not found");
  if (publishAt.getTime() <= now.getTime() + 60_000) throw new InputError("publishAt must be in the future");
  const metadata = { ...job.metadata, publishAt: publishAt.toISOString(), privacyStatus: "private" as const };
  if (job.youtubeVideoId) {
    if (!["scheduled", "processing"].includes(job.status)) throw new ConflictError(`video is ${job.status}; change it in YouTube Studio`);
    const ch = await d.store.getChannel(job.channelId);
    if (!ch) throw new InputError("channel missing");
    await d.apiFor(ch).updateSchedule(job.youtubeVideoId, metadata, publishAt);
    await d.store.addQuota(ch.id, quotaDay(now), COST.videosUpdate);
  } else if (job.uploadMode === "at" && job.runAt > publishAt) {
    throw new InputError("publishAt is before the deferred uploadAt");
  } else if (job.status === "uploading") {
    throw new ConflictError("upload in progress; try again in a minute");
  }
  await d.store.updateJob(id, { publishAt, metadata, log: [...job.log, entry(`rescheduled to ${publishAt.toISOString()}${job.youtubeVideoId ? " (YouTube updated)" : ""}`, now)] });
  return (await d.store.getJob(id))!;
}

/** Soft-remove is cancel; this hard-deletes the scheduler row (YouTube video untouched). */
export async function deleteJob(id: string, d: ManageDeps): Promise<void> {
  const job = await d.store.getJob(id);
  if (!job) throw new InputError("not found");
  if (job.status === "uploading") throw new ConflictError("upload in progress; try again in a minute");
  const ok = await d.store.deleteJob(id);
  if (!ok) throw new InputError("not found");
}

export type BulkAction = { ids: string[]; action: "cancel" | "retry" | "reschedule" | "autoslot" | "delete"; publishAt?: string };

export async function bulkAction(b: BulkAction, d: ManageDeps) {
  const now = d.now?.() ?? new Date();
  const results: { id: string; ok: boolean; error?: string; publishAt?: Date | null }[] = [];
  for (const id of b.ids) {
    try {
      const job = await d.store.getJob(id);
      if (!job) throw new Error("not found");
      if (b.action === "cancel") {
        if (!["queued", "failed"].includes(job.status)) throw new Error(`cannot cancel ${job.status}`);
        await d.store.updateJob(id, { status: "cancelled", log: [...job.log, entry("cancelled", now)] });
      } else if (b.action === "retry") {
        if (!["failed", "cancelled"].includes(job.status)) throw new Error(`job is ${job.status}`);
        await d.store.updateJob(id, { status: "queued", runAt: now, attempts: 0, lastError: null, log: [...job.log, entry("retry requested", now)] });
      } else if (b.action === "delete") {
        if (job.status === "uploading") throw new Error("upload in progress");
        const ok = await d.store.deleteJob(id);
        if (!ok) throw new Error("not found");
        results.push({ id, ok: true });
        continue;
      } else if (b.action === "reschedule") {
        if (!b.publishAt) throw new Error("publishAt required");
        await rescheduleJob(id, new Date(b.publishAt), d);
      } else {
        const ch = (await d.store.getChannel(job.channelId))!;
        const taken = (await d.store.takenPublishSlots(ch.id, job.metadata.type)).filter((t) => t.getTime() !== job.publishAt?.getTime());
        await rescheduleJob(id, nextFreeSlot(job.metadata.type, now, taken, ch.slots), d);
      }
      results.push({ id, ok: true, publishAt: (await d.store.getJob(id))?.publishAt });
    } catch (e) {
      results.push({ id, ok: false, error: (e as Error).message });
    }
  }
  return results;
}
