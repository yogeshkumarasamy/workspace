import { generatedStream } from "./bytes";
import type { Env } from "./env";
import { GENERATED_SOURCE_MAX_BYTES, json, parseRangeHeader } from "./protocol";

export async function handleSource(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname === "/source/generated") return generated(url);
  if (url.pathname === "/source/r2") return r2(url, request, env);
  return json({ error: "not found" }, 404);
}

function generated(url: URL): Response {
  const seed = Number(url.searchParams.get("seed") ?? "1");
  const size = Number(url.searchParams.get("size") ?? "0");
  if (!Number.isInteger(seed) || !Number.isInteger(size) || size < 1) {
    return json({ error: "generated source needs integer seed and size" }, 400);
  }
  if (size > GENERATED_SOURCE_MAX_BYTES) {
    return json(
      { error: "generated source is capped at 1 MiB. Measure with an R2 object or a Drive file." },
      413,
    );
  }
  const rangeHeader = url.searchParams.get("_range") ?? null;
  return ranged(size, rangeHeader, (start, length) => generatedStream(seed, start, length));
}

async function r2(url: URL, request: Request, env: Env): Promise<Response> {
  const key = url.searchParams.get("key");
  if (!key) return json({ error: "r2 source needs key" }, 400);
  if (!env.BUCKET) return json({ error: "R2 binding missing" }, 500);
  const head = await env.BUCKET.head(key);
  if (!head) return json({ error: "r2 object not found" }, 404);
  const range = parseRangeHeader(request.headers.get("Range"));
  if (!range) {
    const object = await env.BUCKET.get(key);
    if (!object) return json({ error: "r2 object not found" }, 404);
    return new Response(object.body, {
      status: 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Length": String(object.size),
        "Content-Type": "application/octet-stream",
      },
    });
  }
  const length = range.endInclusive - range.start + 1;
  const object = await env.BUCKET.get(key, {
    range: { offset: range.start, length },
  });
  if (!object) return json({ error: "r2 object not found" }, 404);
  return new Response(object.body, {
    status: 206,
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${range.start}-${range.endInclusive}/${head.size}`,
      "Content-Length": String(length),
      "Content-Type": "application/octet-stream",
    },
  });
}

function ranged(
  size: number,
  rangeHeader: string | null,
  stream: (start: number, length: number) => ReadableStream<Uint8Array>,
): Response {
  const range = parseRangeHeader(rangeHeader);
  if (!range) {
    return new Response(stream(0, size), {
      status: 200,
      headers: {
        "Accept-Ranges": "bytes",
        "Content-Length": String(size),
        "Content-Type": "application/octet-stream",
      },
    });
  }
  if (range.start < 0 || range.endInclusive < range.start || range.endInclusive >= size) {
    return json({ error: "range not satisfiable" }, 416);
  }
  const length = range.endInclusive - range.start + 1;
  return new Response(stream(range.start, length), {
    status: 206,
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${range.start}-${range.endInclusive}/${size}`,
      "Content-Length": String(length),
      "Content-Type": "application/octet-stream",
    },
  });
}

/** Copies the Range header onto the URL so generated() stays a pure function of the URL. */
export function generatedFromRequest(request: Request): Response {
  const url = new URL(request.url);
  const header = request.headers.get("Range");
  if (header) url.searchParams.set("_range", header);
  return generated(url);
}
