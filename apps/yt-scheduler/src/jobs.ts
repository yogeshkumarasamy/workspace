import { z } from "zod";
import { JobInputSchema } from "./schema.js";
import { nextFreeSlot } from "./slots.js";
import type { Store } from "./store.js";
import type { Job } from "./types.js";

export class InputError extends Error { constructor(msg: string, public issues?: unknown) { super(msg); } }

/** Validate raw job JSON, resolve channel, apply channel defaults, auto-slot publishAt. */
export async function createJob(raw: unknown, store: Store, now = new Date()): Promise<{ job: Job; created: boolean }> {
  const pre = z.object({ channel: z.string().optional(), metadata: z.object({ channel: z.string().optional() }).passthrough() }).passthrough().safeParse(raw);
  if (!pre.success) throw new InputError("invalid job", pre.error.issues);
  const ref = pre.data.channel ?? pre.data.metadata.channel;
  if (!ref) throw new InputError("channel (id or @handle) is required");
  const channel = await store.findChannel(ref);
  if (!channel) throw new InputError(`unknown channel '${ref}'. Connect it first in the UI.`);

  const rawMeta = pre.data.metadata as Record<string, unknown>;
  const type = rawMeta.type === "short" ? "short" : "long";
  const { shortsPlaylist, longPlaylist, ...metaDefaults } = channel.defaults;
  const defPlaylist = type === "short" ? shortsPlaylist : longPlaylist;
  const merged = { ...pre.data, channel: ref, metadata: { ...metaDefaults, ...(defPlaylist ? { playlist: defPlaylist } : {}), ...rawMeta } };
  const parsed = JobInputSchema.safeParse(merged);
  if (!parsed.success) throw new InputError("invalid job", parsed.error.issues);
  const input = parsed.data;

  const warnings: string[] = [];
  let autoNote = "";
  let publishAt: Date | null = input.metadata.publishAt ? new Date(input.metadata.publishAt) : null;
  if (!publishAt && input.metadata.privacyStatus === "private") {
    publishAt = nextFreeSlot(input.metadata.type, now, await store.takenPublishSlots(channel.id, input.metadata.type), channel.slots);
    autoNote = `auto-slotted publishAt ${publishAt.toISOString()}`;
  }
  if (publishAt && publishAt.getTime() < now.getTime()) warnings.push("publishAt is in the past; video will be uploaded with privacyStatus as given");
  const runAt = input.uploadMode === "at" ? new Date(input.uploadAt!) : now;
  if (publishAt && runAt > publishAt) throw new InputError("uploadAt must be before publishAt");
  const metadata = { ...input.metadata, channel: channel.youtubeChannelId, publishAt: publishAt?.toISOString() };

  return store.insertJob({
    channelId: channel.id, idempotencyKey: input.idempotencyKey, status: "queued",
    video: input.video, thumbnail: input.thumbnail ?? null, metadata, uploadMode: input.uploadMode,
    runAt, publishAt, attempts: 0, lastError: null, youtubeVideoId: null, warnings, log: [{ at: now.toISOString(), msg: "created" }, ...(autoNote ? [{ at: now.toISOString(), msg: autoNote }] : [])],
  });
}
