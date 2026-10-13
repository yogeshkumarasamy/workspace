import { MAX_ATTEMPTS, backoffMs, isQuotaError, isRetryable } from "./backoff.js";
import { COST, JOB_COST, canAfford, nextQuotaReset, quotaDay } from "./quota.js";
import type { Store } from "./store.js";
import type { Channel, Job } from "./types.js";
import type { YouTubeApi } from "./youtube.js";

export interface WorkerDeps {
  store: Store;
  apiFor(channel: Channel): YouTubeApi;
  dailyQuota: number;
  now?: () => Date;
  log?: (msg: string) => void;
}

/** Process one claimed job. Never throws; records outcome on the job. */
export async function processJob(job: Job, deps: WorkerDeps): Promise<Job> {
  const { store } = deps;
  const now = deps.now?.() ?? new Date();
  const day = quotaDay(now);
  const log = [...(job.log ?? [])];
  const L = (msg: string) => { log.push({ at: (deps.now?.() ?? new Date()).toISOString(), msg }); return log; };
  const channel = await store.getChannel(job.channelId);
  if (!channel) { await store.updateJob(job.id, { status: "failed", lastError: "channel no longer connected", log: L("failed: channel no longer connected") }); return (await store.getJob(job.id))!; }

  // Quota is per Google Cloud project, so check the project-wide total.
  const used = await store.quotaUsed(day);
  if (!canAfford(used.total, deps.dailyQuota)) {
    await store.updateJob(job.id, { status: "queued", runAt: nextQuotaReset(now), lastError: `deferred: quota ${used.total}/${deps.dailyQuota} used today`, log: L(`deferred until quota reset (${used.total}/${deps.dailyQuota})`) });
    return (await store.getJob(job.id))!;
  }

  const api = deps.apiFor(channel);
  const warnings = [...job.warnings];
  const attempts = job.attempts + 1;
  try {
    let videoId = job.youtubeVideoId;
    if (!videoId) {
      L(`attempt ${attempts}: opening ${job.video.kind} source`);
      const media = await api.open(job.video);
      await store.addQuota(channel.id, day, COST.videosInsert);
      videoId = await api.insertVideo(job.metadata, job.publishAt, media);
      await store.updateJob(job.id, { youtubeVideoId: videoId, status: "processing", attempts, log: L(`uploaded as ${videoId}`) });
    }
    // Post-upload steps are best-effort: the video exists, so we warn instead of re-uploading.
    if (job.thumbnail) {
      try { await api.setThumbnail(videoId, await api.open(job.thumbnail)); await store.addQuota(channel.id, day, COST.thumbnailsSet); L("thumbnail set"); }
      catch (e) { warnings.push(`thumbnail failed: ${msg(e)} (custom thumbnails need a phone-verified channel)`); }
    }
    if (job.metadata.playlist) {
      try {
        const pid = await api.resolvePlaylist(job.metadata.playlist, job.metadata.createPlaylistIfMissing);
        await store.addQuota(channel.id, day, COST.playlistsList);
        if (pid) { await api.addToPlaylist(pid, videoId); await store.addQuota(channel.id, day, COST.playlistItemsInsert); L(`added to playlist ${pid}`); }
        else warnings.push(`playlist '${job.metadata.playlist}' not found`);
      } catch (e) { warnings.push(`playlist failed: ${msg(e)}`); }
    }
    const scheduled = !!job.publishAt && job.publishAt.getTime() > now.getTime();
    await store.updateJob(job.id, { status: scheduled ? "scheduled" : "published", lastError: null, warnings, attempts, log: L(scheduled ? `scheduled for ${job.publishAt!.toISOString()}` : "published") });
  } catch (e) {
    const err = msg(e);
    deps.log?.(`job ${job.id} attempt ${attempts} failed: ${err}`);
    if (isQuotaError(e)) {
      await store.updateJob(job.id, { status: "queued", runAt: nextQuotaReset(now), lastError: err, attempts: job.attempts, log: L(`quota error, waiting for reset: ${err}`) });
    } else if (isRetryable(e) && attempts < MAX_ATTEMPTS) {
      await store.updateJob(job.id, { status: "queued", runAt: new Date(now.getTime() + backoffMs(attempts)), lastError: err, attempts, log: L(`attempt ${attempts} failed, will retry: ${err}`) });
    } else {
      await store.updateJob(job.id, { status: "failed", lastError: err, attempts, log: L(`failed permanently: ${err}`) });
    }
  }
  return (await store.getJob(job.id))!;
}

/** Drain due jobs, one at a time (uploads are bandwidth-bound; keep it serial). */
export async function tick(deps: WorkerDeps, max = 5): Promise<number> {
  let n = 0;
  for (; n < max; n++) {
    const job = await deps.store.claimDue(deps.now?.() ?? new Date());
    if (!job) break;
    await processJob(job, deps);
  }
  return n;
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
export { JOB_COST };
