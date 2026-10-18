import type { Metadata } from "../../yt-scheduler/src/schema.ts";

export const DEFAULT_CHUNK_BYTES = 64 * 1024 * 1024;
export const YOUTUBE_ALIGNMENT_BYTES = 256 * 1024;
/** Workers Free rejects request bodies over 100 MB. 64 MiB stays under that. */
export const MAX_CHUNK_BYTES = 64 * 1024 * 1024;
/** One mock upload is a single chunk at the default size, so a preview finishes in one step. */
export const MOCK_MEDIA_BYTES = 1024 * 1024;

export interface YoutubeStatus {
  privacyStatus: "private" | "public" | "unlisted";
  publishAt?: string;
  selfDeclaredMadeForKids: boolean;
  containsSyntheticMedia: boolean;
  embeddable: true;
}

/**
 * Prod videos are public. A future publishAt has to be sent as private: YouTube
 * flips that video to public at publishAt. A private status with no future time
 * would leave the video private, so that case is uploaded as public instead.
 */
export function youtubeStatus(meta: Pick<Metadata, "privacyStatus" | "madeForKids" | "containsSyntheticMedia">, publishAt: Date | null, now: Date): YoutubeStatus {
  const future = !!publishAt && publishAt.getTime() > now.getTime() + 15_000;
  const base = {
    selfDeclaredMadeForKids: meta.madeForKids,
    containsSyntheticMedia: meta.containsSyntheticMedia,
    embeddable: true as const,
  };
  if (future && publishAt) {
    return { ...base, privacyStatus: "private", publishAt: publishAt.toISOString() };
  }
  if (meta.privacyStatus === "unlisted") return { ...base, privacyStatus: "unlisted" };
  return { ...base, privacyStatus: "public" };
}

export function videoResource(meta: Metadata, publishAt: Date | null, now: Date) {
  let description = meta.description;
  if (meta.type === "short" && !/#shorts/i.test(meta.title + description)) description = `${description}\n\n#Shorts`.trim();
  return {
    snippet: {
      title: meta.title,
      description,
      tags: meta.tags,
      categoryId: meta.categoryId,
      defaultLanguage: meta.defaultLanguage,
      defaultAudioLanguage: meta.defaultAudioLanguage,
    },
    status: youtubeStatus(meta, publishAt, now),
  };
}

export function parseChunkBytes(raw: string | number | undefined, fallback = DEFAULT_CHUNK_BYTES): number {
  const value = raw === undefined || raw === "" ? fallback : Number(raw);
  if (!Number.isInteger(value) || value < YOUTUBE_ALIGNMENT_BYTES) {
    throw new Error(`UPLOAD_CHUNK_BYTES must be an integer >= ${YOUTUBE_ALIGNMENT_BYTES}`);
  }
  if (value > MAX_CHUNK_BYTES) {
    throw new Error("UPLOAD_CHUNK_BYTES must be <= 64 MiB so a chunk stays under the 100 MB request-body cap");
  }
  if (value % YOUTUBE_ALIGNMENT_BYTES !== 0) {
    throw new Error("UPLOAD_CHUNK_BYTES must be a multiple of 256 KiB");
  }
  return value;
}
