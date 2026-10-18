import type { JobInput, Metadata, Source } from "./schema.js";
import type { SlotRules } from "./slots.js";

export type JobStatus = "queued" | "uploading" | "processing" | "scheduled" | "published" | "failed" | "cancelled";

export interface Channel {
  id: string; // internal uuid
  youtubeChannelId: string;
  handle: string | null;
  title: string;
  refreshTokenEnc: string;
  googleEmail: string | null;
  /** Optional separate Google account for Drive reads (encrypted refresh token). */
  driveRefreshTokenEnc: string | null;
  defaults: Partial<Pick<Metadata, "categoryId" | "defaultLanguage" | "defaultAudioLanguage" | "madeForKids">> & {
    shortsPlaylist?: string;
    longPlaylist?: string;
  };
  slots: SlotRules;
  createdAt: Date;
}

export interface Job {
  id: string;
  channelId: string;
  idempotencyKey: string;
  status: JobStatus;
  video: Source;
  thumbnail: Source | null;
  metadata: Metadata;
  uploadMode: JobInput["uploadMode"];
  runAt: Date; // when the worker may pick it up
  publishAt: Date | null;
  attempts: number;
  lastError: string | null;
  youtubeVideoId: string | null;
  warnings: string[];
  log: { at: string; msg: string }[];
  createdAt: Date;
  updatedAt: Date;
}
