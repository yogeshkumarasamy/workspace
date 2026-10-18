import { z } from "zod";

/** A media source: public/signed https URL or a Google Drive file id. */
export const SourceSchema = z.union([
  z.string().url().startsWith("https://").transform((url) => ({ kind: "url" as const, url })),
  z.object({ url: z.string().url().startsWith("https://") }).transform((s) => ({ kind: "url" as const, url: s.url })),
  z.object({ driveFileId: z.string().min(10) }).transform((s) => ({ kind: "drive" as const, fileId: s.driveFileId })),
]);
export type Source = z.output<typeof SourceSchema>;

/**
 * Sidecar metadata.json that the YouTube Ideas agent writes next to each video.
 * Also the "metadata" block of POST /api/jobs.
 */
export const MetadataSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().max(5000).default(""),
  tags: z.array(z.string().min(1)).default([]).refine((t) => t.join(",").length <= 500, "tags total must be <= 500 chars"),
  categoryId: z.string().regex(/^\d+$/).default("1"),
  defaultLanguage: z.string().default("ta"),
  defaultAudioLanguage: z.string().default("ta"),
  madeForKids: z.boolean().default(true),
  containsSyntheticMedia: z.boolean().default(false),
  type: z.enum(["short", "long"]).default("long"),
  privacyStatus: z.enum(["private", "unlisted", "public"]).default("private"),
  /** ISO 8601 with offset, e.g. 2026-10-20T07:00:00+05:30. Omit to auto-slot. */
  publishAt: z.string().datetime({ offset: true }).optional(),
  /** Playlist id (PL...) or exact playlist name (resolved; created if createPlaylistIfMissing). */
  playlist: z.string().min(1).optional(),
  createPlaylistIfMissing: z.boolean().default(false),
  /** Target channel: YouTube channel id (UC...) or handle (@meeyazhpirai). Optional here if given on the job. */
  channel: z.string().min(2).optional(),
});
export type Metadata = z.output<typeof MetadataSchema>;

export const JobInputSchema = z.object({
  idempotencyKey: z.string().min(1).max(200),
  /** YouTube channel id (UC...) or handle (@name). Falls back to metadata.channel. */
  channel: z.string().min(2).optional(),
  video: SourceSchema,
  thumbnail: SourceSchema.optional(),
  metadata: MetadataSchema,
  /** "now": upload immediately (uses YouTube publishAt if set). "at": defer the upload itself until uploadAt. */
  uploadMode: z.enum(["now", "at"]).default("now"),
  uploadAt: z.string().datetime({ offset: true }).optional(),
}).refine((j) => !!(j.channel ?? j.metadata.channel), { message: "channel (id or @handle) is required", path: ["channel"] })
  .refine((j) => j.uploadMode !== "at" || !!j.uploadAt, { message: "uploadAt required when uploadMode=at", path: ["uploadAt"] });
export type JobInput = z.output<typeof JobInputSchema>;

export const BulkSchema = z.object({ jobs: z.array(z.unknown()).min(1).max(200) });

export const DriveFolderImportSchema = z.object({
  folderId: z.string().min(10),
  channel: z.string().min(2).optional(),
  idempotencyKey: z.string().optional(),
  recursive: z.boolean().default(true),
});
