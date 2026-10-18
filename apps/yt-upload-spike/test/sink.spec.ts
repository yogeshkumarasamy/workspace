import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { fillRange, sha256Hex } from "../src/bytes";
import worker from "../src/index";

interface JsonBody {
  id?: string;
  received?: number;
  complete?: boolean;
  appended?: number;
  duplicateRetries?: number;
  partCount?: number;
  sha256?: string | null;
  parts?: Array<{ start: number }>;
  error?: string;
}

async function api(pathname: string, init?: RequestInit): Promise<Response> {
  if (!worker.fetch) throw new Error("fetch handler missing");
  const request = new Request(`https://yt-upload-spike.internal${pathname}`, init) as Request<
    unknown,
    IncomingRequestCfProperties
  >;
  return worker.fetch(request, env);
}

async function read(response: Response): Promise<JsonBody> {
  return response.json() as Promise<JsonBody>;
}

async function createSession(totalSize: number, storage = "memory"): Promise<{ id: string }> {
  const response = await api("/sink/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ totalSize, storage }),
  });
  expect(response.status).toBe(200);
  const body = await read(response);
  if (!body.id) throw new Error("session id missing");
  return { id: body.id };
}

function putRange(id: string, seed: number, start: number, end: number, total: number): Promise<Response> {
  const bytes = fillRange(seed, start, end - start + 1);
  return api(`/sink/sessions/${id}`, {
    method: "PUT",
    headers: {
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Content-Type": "application/octet-stream",
    },
    body: bytes,
  });
}

describe("mock resumable sink", () => {
  it("answers a status probe with 308 and no Range before any bytes", async () => {
    const session = await createSession(32);
    const response = await api(`/sink/sessions/${session.id}`, {
      method: "PUT",
      headers: { "Content-Range": "bytes */32", "Content-Length": "0" },
    });
    expect(response.status).toBe(308);
    expect(response.headers.get("Range")).toBeNull();
    const body = await read(response);
    expect(body.received).toBe(0);
    expect(body.complete).toBe(false);
  });

  it("returns 308 with Range until the last chunk, then 200 and the sha256", async () => {
    const total = 32;
    const seed = 4;
    const session = await createSession(total);
    const first = await putRange(session.id, seed, 0, 15, total);
    expect(first.status).toBe(308);
    expect(first.headers.get("Range")).toBe("bytes=0-15");
    const mid = await read(first);
    expect(mid.received).toBe(16);
    expect(mid.appended).toBe(16);

    const second = await putRange(session.id, seed, 16, 31, total);
    expect(second.status).toBe(200);
    const done = await read(second);
    expect(done.complete).toBe(true);
    expect(done.received).toBe(total);
    expect(done.sha256).toBe(await sha256Hex(fillRange(seed, 0, total)));
  });

  it("does not append when the same range is retried", async () => {
    const total = 24;
    const seed = 9;
    const session = await createSession(total);
    expect((await putRange(session.id, seed, 0, 11, total)).status).toBe(308);
    const retry = await putRange(session.id, seed, 0, 11, total);
    expect(retry.status).toBe(308);
    const mid = await read(retry);
    expect(mid.received).toBe(12);
    expect(mid.appended).toBe(12);
    expect(mid.duplicateRetries).toBe(1);
    expect(mid.partCount).toBe(1);

    const done = await read(await putRange(session.id, seed, 12, 23, total));
    expect(done.complete).toBe(true);
    expect(done.appended).toBe(total);
    expect(done.sha256).toBe(await sha256Hex(fillRange(seed, 0, total)));
  });

  it("rejects a gap and an overlap without writing those bytes", async () => {
    const session = await createSession(20);
    const gap = await putRange(session.id, 1, 5, 9, 20);
    expect(gap.status).toBe(308);
    expect((await read(gap)).received).toBe(0);

    expect((await putRange(session.id, 1, 0, 9, 20)).status).toBe(308);
    const overlap = await putRange(session.id, 1, 5, 19, 20);
    expect(overlap.status).toBe(409);
    const body = await read(overlap);
    expect(body.received).toBe(10);
    expect(body.appended).toBe(10);

    const done = await read(await putRange(session.id, 1, 10, 19, 20));
    expect(done.sha256).toBe(await sha256Hex(fillRange(1, 0, 20)));
    expect(done.appended).toBe(20);
  });

  it("serves a generated range and refuses a generated file over 1 MiB", async () => {
    const response = await api("/source/generated?seed=3&size=8", {
      headers: { Range: "bytes=2-5" },
    });
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Range")).toBe("bytes 2-5/8");
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(bytes)).toEqual(Array.from(fillRange(3, 2, 4)));

    const huge = await api("/source/generated?seed=1&size=1048577", {
      headers: { Range: "bytes=0-15" },
    });
    expect(huge.status).toBe(413);
  });

  it("stores an r2 part without hashing it inside the sink", async () => {
    const total = 8;
    const seed = 5;
    const session = await createSession(total, "r2");
    expect((await putRange(session.id, seed, 0, 3, total)).status).toBe(308);
    const doneResponse = await putRange(session.id, seed, 4, 7, total);
    expect(doneResponse.status).toBe(200);
    const done = await read(doneResponse);
    expect(done.sha256).toBeNull();
    expect(done.appended).toBe(total);
    const parts = done.parts ?? [];
    const out = new Uint8Array(total);
    let cursor = 0;
    for (const part of parts) {
      const body = await api(`/sink/sessions/${session.id}/parts/${part.start}`);
      expect(body.status).toBe(200);
      const bytes = new Uint8Array(await body.arrayBuffer());
      out.set(bytes, cursor);
      cursor += bytes.byteLength;
    }
    expect(await sha256Hex(out)).toBe(await sha256Hex(fillRange(seed, 0, total)));
  });
});
