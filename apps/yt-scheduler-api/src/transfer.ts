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
  if (status) return { kind: "status", start: 0, endInclusive: -1, total: Number(status[1]) };
  const match = CONTENT_RANGE.exec(header.trim());
  if (!match) return null;
  return { kind: "bytes", start: Number(match[1]), endInclusive: Number(match[2]), total: Number(match[3]) };
}

export function receivedFromRangeHeader(header: string | null): number {
  if (!header) return 0;
  const match = RANGE_HEADER.exec(header.trim());
  if (!match) throw new Error(`unreadable Range header: ${header}`);
  return Number(match[2]) + 1;
}

export interface ChunkFetcher {
  fetch(url: string, init?: RequestInit): Promise<Response>;
}

export interface TransferResult {
  status: number;
  received: number;
  complete: boolean;
  videoId: string | null;
}

/**
 * GET a byte range and PUT that body to the resumable sink.
 * The source stream is passed through. This does not buffer it.
 */
export async function transferChunk(input: {
  fetcher: ChunkFetcher;
  sourceUrl: string;
  sinkUrl: string;
  offset: number;
  endInclusive: number;
  totalSize: number;
  sourceHeaders?: HeadersInit;
  sinkHeaders?: HeadersInit;
}): Promise<TransferResult> {
  const length = input.endInclusive - input.offset + 1;
  if (length < 1) throw new Error("empty chunk");

  const sourceHeaders = new Headers(input.sourceHeaders);
  sourceHeaders.set("Range", `bytes=${input.offset}-${input.endInclusive}`);
  const source = await input.fetcher.fetch(input.sourceUrl, { headers: sourceHeaders });
  if (source.status !== 206 || !source.body) {
    const detail = await safeText(source);
    throw new Error(`source returned ${source.status} for bytes ${input.offset}-${input.endInclusive}: ${detail}`);
  }

  const headers = new Headers(input.sinkHeaders);
  headers.set("Content-Range", `bytes ${input.offset}-${input.endInclusive}/${input.totalSize}`);
  headers.set("Content-Length", String(length));
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/octet-stream");
  const sink = await input.fetcher.fetch(input.sinkUrl, {
    method: "PUT",
    headers,
    body: source.body,
    duplex: "half",
  } as RequestInit);

  if (sink.status !== 308 && sink.status !== 200 && sink.status !== 201) {
    const detail = await safeText(sink);
    throw new Error(`sink returned ${sink.status}: ${detail}`);
  }
  const payload = await readJson(sink);
  const complete = sink.status === 200 || sink.status === 201 || payload.complete === true;
  const received = complete
    ? input.totalSize
    : typeof payload.received === "number"
      ? payload.received
      : receivedFromRangeHeader(sink.headers.get("Range"));
  return { status: sink.status, received, complete, videoId: typeof payload.id === "string" ? payload.id : null };
}

export async function queryStatus(fetcher: ChunkFetcher, sinkUrl: string, totalSize: number, sinkHeaders?: HeadersInit): Promise<{ received: number; complete: boolean; videoId: string | null }> {
  const headers = new Headers(sinkHeaders);
  headers.set("Content-Range", `bytes */${totalSize}`);
  headers.set("Content-Length", "0");
  const response = await fetcher.fetch(sinkUrl, { method: "PUT", headers });
  if (response.status !== 308 && response.status !== 200 && response.status !== 201) {
    const detail = await safeText(response);
    throw new Error(`status returned ${response.status}: ${detail}`);
  }
  const payload = await readJson(response);
  const complete = response.status === 200 || response.status === 201 || payload.complete === true;
  const received = complete
    ? totalSize
    : typeof payload.received === "number"
      ? payload.received
      : receivedFromRangeHeader(response.headers.get("Range"));
  return { received, complete, videoId: typeof payload.id === "string" ? payload.id : null };
}

async function safeText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return "";
  }
}

async function readJson(response: Response): Promise<{ received?: number; complete?: boolean; id?: string }> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as { received?: number; complete?: boolean; id?: string };
  } catch {
    return {};
  }
}
