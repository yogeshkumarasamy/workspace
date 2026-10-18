import { describe, expect, it } from "vitest";
import { authorized } from "../src/env";
import { transferChunk } from "../src/transfer";

describe("passthrough transfer", () => {
  it("puts the source body stream without reading it first", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3, 4]));
        controller.close();
      },
    });
    const seen: Array<{ url: string; body: BodyInit | null | undefined }> = [];
    const fetcher = {
      async fetch(url: string, init?: RequestInit): Promise<Response> {
        seen.push({ url, body: init?.body });
        if (seen.length === 1) {
          return new Response(body, {
            status: 206,
            headers: { "Content-Range": "bytes 0-3/4" },
          });
        }
        return new Response(JSON.stringify({ received: 4, complete: true }), {
          status: 200,
          headers: { Range: "bytes=0-3", "Content-Type": "application/json" },
        });
      },
    };

    const result = await transferChunk({
      fetcher,
      sourceUrl: "https://yt-upload-spike.internal/source/generated?seed=1&size=4",
      sinkUrl: "https://yt-upload-spike.internal/sink/sessions/s",
      offset: 0,
      endInclusive: 3,
      totalSize: 4,
    });

    expect(result).toEqual({ status: 200, received: 4, complete: true });
    expect(seen[1]?.body).toBe(body);
  });

  it("sends the YouTube Content-Range and the source Range", async () => {
    let sourceRange = "";
    let contentRange = "";
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([9]));
        controller.close();
      },
    });
    const fetcher = {
      async fetch(_url: string, init?: RequestInit): Promise<Response> {
        if (!sourceRange) {
          sourceRange = new Headers(init?.headers).get("Range") ?? "";
          return new Response(body, { status: 206 });
        }
        contentRange = new Headers(init?.headers).get("Content-Range") ?? "";
        return new Response(JSON.stringify({ received: 1, complete: true }), { status: 200 });
      },
    };
    await transferChunk({
      fetcher,
      sourceUrl: "https://example/source",
      sinkUrl: "https://example/sink",
      offset: 0,
      endInclusive: 0,
      totalSize: 1,
    });
    expect(sourceRange).toBe("bytes=0-0");
    expect(contentRange).toBe("bytes 0-0/1");
  });
});

describe("spike auth", () => {
  it("allows local tests with no token and checks a bearer when one is set", () => {
    const open = new Request("https://yt-upload-spike.internal/health");
    const good = new Request("https://yt-upload-spike.internal/sink/sessions", {
      headers: { Authorization: "Bearer secret" },
    });
    const bad = new Request("https://yt-upload-spike.internal/sink/sessions");
    expect(authorized(open, {})).toBe(true);
    expect(authorized(good, { SPIKE_TOKEN: "secret" })).toBe(true);
    expect(authorized(bad, { SPIKE_TOKEN: "secret" })).toBe(false);
  });
});
