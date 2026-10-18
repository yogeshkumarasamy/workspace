import { receivedFromRangeHeader } from "./protocol";

export interface ChunkFetcher {
  fetch(url: string, init?: RequestInit): Promise<Response>;
}

export interface TransferResult {
  status: number;
  received: number;
  complete: boolean;
}

/**
 * GET a byte range and PUT that response body to the sink.
 * The source body is passed through as the PUT body. This function does not
 * call arrayBuffer(), text(), blob(), or tee() on it.
 */
export async function transferChunk(input: {
  fetcher: ChunkFetcher;
  sourceUrl: string;
  sinkUrl: string;
  offset: number;
  endInclusive: number;
  totalSize: number;
  sourceHeaders?: HeadersInit;
}): Promise<TransferResult> {
  const length = input.endInclusive - input.offset + 1;
  if (length < 1) throw new Error("empty chunk");

  const sourceHeaders = new Headers(input.sourceHeaders);
  sourceHeaders.set("Range", `bytes=${input.offset}-${input.endInclusive}`);
  const source = await input.fetcher.fetch(input.sourceUrl, { headers: sourceHeaders });
  if (source.status !== 206) {
    const detail = await safeText(source);
    throw new Error(`source returned ${source.status} for bytes ${input.offset}-${input.endInclusive}: ${detail}`);
  }
  if (!source.body) throw new Error("source response has no body");

  const sink = await input.fetcher.fetch(input.sinkUrl, {
    method: "PUT",
    headers: {
      "Content-Range": `bytes ${input.offset}-${input.endInclusive}/${input.totalSize}`,
      "Content-Length": String(length),
      "Content-Type": "application/octet-stream",
    },
    body: source.body,
    duplex: "half",
  } as RequestInit);

  if (sink.status !== 308 && sink.status !== 200) {
    const detail = await safeText(sink);
    throw new Error(`sink returned ${sink.status}: ${detail}`);
  }
  const payload = await readJson(sink);
  const received =
    typeof payload.received === "number"
      ? payload.received
      : receivedFromRangeHeader(sink.headers.get("Range"));
  return {
    status: sink.status,
    received: sink.status === 200 ? input.totalSize : received,
    complete: sink.status === 200 || payload.complete === true,
  };
}

export async function queryStatus(
  fetcher: ChunkFetcher,
  sinkUrl: string,
  totalSize: number,
): Promise<{ received: number; complete: boolean }> {
  const response = await fetcher.fetch(sinkUrl, {
    method: "PUT",
    headers: {
      "Content-Range": `bytes */${totalSize}`,
      "Content-Length": "0",
    },
  });
  if (response.status !== 308 && response.status !== 200) {
    const detail = await safeText(response);
    throw new Error(`status returned ${response.status}: ${detail}`);
  }
  const payload = await readJson(response);
  if (typeof payload.received === "number") {
    return { received: payload.received, complete: response.status === 200 || payload.complete === true };
  }
  return {
    received: response.status === 200 ? totalSize : receivedFromRangeHeader(response.headers.get("Range")),
    complete: response.status === 200,
  };
}

async function safeText(response: Response): Promise<string> {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return "";
  }
}

async function readJson(response: Response): Promise<{ received?: number; complete?: boolean }> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as { received?: number; complete?: boolean };
  } catch {
    return {};
  }
}
