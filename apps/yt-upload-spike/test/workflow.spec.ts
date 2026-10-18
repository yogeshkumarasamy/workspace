import { introspectWorkflowInstance } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { fillRange, sha256Hex } from "../src/bytes";
import worker from "../src/index";
import type { ChunkMessage } from "../src/queue";

interface JsonBody {
  id?: string;
  sessionId?: string;
  received?: number;
  complete?: boolean;
  appended?: number;
  duplicateRetries?: number;
  partCount?: number;
  sha256?: string | null;
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

describe("upload workflow", () => {
  it("resumes after a forced interruption without duplicating bytes", async () => {
    const total = 48;
    const seed = 7;
    const failId = crypto.randomUUID();
    await using failed = await introspectWorkflowInstance(env.UPLOAD_WORKFLOW, failId);
    await failed.modify(async (modifier) => {
      await modifier.disableSleeps();
    });

    const started = await api("/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instanceId: failId,
        totalSize: total,
        chunkSize: 16,
        allowUnaligned: true,
        storage: "memory",
        source: { kind: "generated", seed },
        interruptAfterChunks: 1,
        retryLimit: 0,
      }),
    });
    expect(started.status).toBe(202);
    const startedBody = await read(started);
    expect(await failed.waitForStepResult({ name: "chunk-0" })).toMatchObject({ received: 16 });
    await failed.waitForStatus("errored");
    const error = await failed.getError();
    expect(error.message).toContain("NonRetryableError");

    const mid = await read(await api(`/sink/sessions/${startedBody.sessionId}`));
    expect(mid.received).toBe(16);
    expect(mid.appended).toBe(16);
    expect(mid.partCount).toBe(1);

    const resumeId = crypto.randomUUID();
    await using resumed = await introspectWorkflowInstance(env.UPLOAD_WORKFLOW, resumeId);
    await resumed.modify(async (modifier) => {
      await modifier.disableSleeps();
    });
    const continued = await api("/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instanceId: resumeId, sessionId: startedBody.sessionId, retryLimit: 0 }),
    });
    expect(continued.status).toBe(202);
    await resumed.waitForStatus("complete");
    const output = await resumed.getOutput();
    expect(output).toMatchObject({ complete: true, received: total });

    const done = await read(await api(`/sink/sessions/${startedBody.sessionId}`));
    expect(done.received).toBe(total);
    expect(done.appended).toBe(total);
    expect(done.duplicateRetries).toBe(0);
    expect(done.partCount).toBe(3);
    expect(done.sha256).toBe(await sha256Hex(fillRange(seed, 0, total)));
  });

  it("rejects an unaligned chunk unless the caller opts into the test size", async () => {
    const response = await api("/uploads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        totalSize: 1000,
        chunkSize: 1000,
        source: { kind: "generated", seed: 1 },
      }),
    });
    expect(response.status).toBe(400);
  });
});

describe("queue consumer", () => {
  it("uploads one queued chunk through the same passthrough", async () => {
    const total = 8;
    const seed = 2;
    const created = await api("/sink/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        totalSize: total,
        storage: "memory",
        plan: {
          sessionId: "replaced",
          totalSize: total,
          chunkSize: total,
          allowUnaligned: true,
          storage: "memory",
          source: { kind: "generated", seed },
        },
      }),
    });
    const session = await read(created);
    if (!session.id) throw new Error("session id missing");
    let acked = false;
    const message: ChunkMessage = {
      sessionId: session.id,
      totalSize: total,
      offset: 0,
      endInclusive: total - 1,
      source: { kind: "generated", seed },
    };
    if (!worker.queue) throw new Error("queue handler missing");
    await worker.queue(
      {
        queue: "yt-upload-spike-chunks",
        messages: [
          {
            id: "1",
            timestamp: new Date(),
            body: message,
            attempts: 1,
            ack() {
              acked = true;
            },
            retry() {
              throw new Error("retry");
            },
          },
        ],
      } as unknown as Parameters<NonNullable<typeof worker.queue>>[0],
      env,
    );
    expect(acked).toBe(true);
    const done = await read(await api(`/sink/sessions/${session.id}`));
    expect(done.complete).toBe(true);
    expect(done.sha256).toBe(await sha256Hex(fillRange(seed, 0, total)));
  });
});
