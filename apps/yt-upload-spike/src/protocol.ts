import { MAX_SINK_CHUNK_BYTES, YOUTUBE_ALIGNMENT_BYTES } from "./budget";

export const INTERNAL_ORIGIN = "https://yt-upload-spike.internal";
/** Generated ranges larger than this would burn CPU inside the Worker. Use R2 or Drive. */
export const GENERATED_SOURCE_MAX_BYTES = 1024 * 1024;
/** SQLite rows must stay under 2 MB. Base64 of this cap fits. */
export const MEMORY_PART_MAX_BYTES = 256 * 1024;

const CONTENT_RANGE = /^bytes (\d+)-(\d+)\/(\d+)$/;
const STATUS_RANGE = /^bytes \*\/(\d+)$/;
const RANGE_HEADER = /^bytes=(\d+)-(\d+)$/;

export interface ContentRange {
  kind: "bytes" | "status";
  start: number;
  endInclusive: number;
  total: number;
}

export function parseContentRange(header: string | null): ContentRange | null {
  if (!header) return null;
  const status = STATUS_RANGE.exec(header.trim());
  if (status) {
    return { kind: "status", start: 0, endInclusive: -1, total: Number(status[1]) };
  }
  const match = CONTENT_RANGE.exec(header.trim());
  if (!match) return null;
  return {
    kind: "bytes",
    start: Number(match[1]),
    endInclusive: Number(match[2]),
    total: Number(match[3]),
  };
}

export function parseRangeHeader(header: string | null): { start: number; endInclusive: number } | null {
  if (!header) return null;
  const match = RANGE_HEADER.exec(header.trim());
  if (!match) return null;
  return { start: Number(match[1]), endInclusive: Number(match[2]) };
}

export function receivedFromRangeHeader(header: string | null): number {
  if (!header) return 0;
  const match = RANGE_HEADER.exec(header.trim());
  if (!match) throw new Error(`unreadable Range header: ${header}`);
  return Number(match[2]) + 1;
}

export function assertChunkSize(chunkSize: number, allowUnaligned: boolean): void {
  if (!Number.isInteger(chunkSize) || chunkSize < 1) {
    throw new Error("chunkSize must be a positive integer");
  }
  if (chunkSize > MAX_SINK_CHUNK_BYTES) {
    throw new Error("chunkSize must be <= 64 MiB so a Worker sink stays under the 100 MB request-body cap");
  }
  if (!allowUnaligned && chunkSize % YOUTUBE_ALIGNMENT_BYTES !== 0) {
    throw new Error("chunkSize must be a multiple of 256 KiB");
  }
}

export interface SourceSpec {
  kind: "generated" | "r2" | "http";
  seed?: number;
  key?: string;
  url?: string;
  /** When true, the external GET gets DRIVE_ACCESS_TOKEN from the Worker env. */
  authorize?: "drive";
}

export interface UploadPlan {
  sessionId: string;
  totalSize: number;
  chunkSize: number;
  allowUnaligned: boolean;
  storage: "auto" | "memory" | "r2";
  source: SourceSpec;
  /**
   * When set, chunk PUTs go to this https origin instead of the in-worker sink.
   * Used only when R2 is unavailable and the Actions runner hosts the mock sink.
   */
  sinkBaseUrl?: string;
  interruptAfterChunks?: number;
  retryLimit?: number;
}

const YOUTUBE_HOST = /(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)googlevideo\.com$|(^|\.)youtube-nocookie\.com$/;

/** Rejects non-https URLs and any host that would send bytes to YouTube. */
export function assertSafeRemoteUrl(raw: string): void {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("remote URL is not valid");
  }
  if (url.protocol !== "https:") throw new Error("remote URL must be https");
  if (YOUTUBE_HOST.test(url.hostname.toLowerCase())) throw new Error("refusing to contact YouTube");
}

export function sinkUrl(plan: Pick<UploadPlan, "sessionId" | "sinkBaseUrl">): string {
  if (plan.sinkBaseUrl) {
    assertSafeRemoteUrl(plan.sinkBaseUrl);
    const base = plan.sinkBaseUrl.replace(/\/$/, "");
    return `${base}/sessions/${plan.sessionId}`;
  }
  return `${INTERNAL_ORIGIN}/sink/sessions/${plan.sessionId}`;
}

export function sourceUrl(plan: UploadPlan): string {
  if (plan.source.kind === "http") {
    if (!plan.source.url) throw new Error("http source requires url");
    return plan.source.url;
  }
  if (plan.source.kind === "r2") {
    if (!plan.source.key) throw new Error("r2 source requires key");
    return `${INTERNAL_ORIGIN}/source/r2?key=${encodeURIComponent(plan.source.key)}`;
  }
  return `${INTERNAL_ORIGIN}/source/generated?seed=${plan.source.seed ?? 1}&size=${plan.totalSize}`;
}

export function json(body: unknown, status = 200, extra?: HeadersInit): Response {
  const headers = new Headers(extra);
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", "*");
  return new Response(JSON.stringify(body), { status, headers });
}
