import { browserTransferPage } from "./browser";
import { authorized, type Env } from "./env";
import { handleQueueBatch, type ChunkMessage } from "./queue";
import {
  assertChunkSize,
  assertSafeRemoteUrl,
  INTERNAL_ORIGIN,
  json,
  type SourceSpec,
  type UploadPlan,
} from "./protocol";
import { generatedFromRequest, handleSource } from "./source";
import { UploadSession } from "./session";
import { UploadWorkflow } from "./workflow";

export { UploadSession, UploadWorkflow };

const CORS: HeadersInit = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization,Content-Type,Content-Range,Range",
};

export default {
  async fetch(request, env): Promise<Response> {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    if (url.pathname === "/health" || url.pathname === "/") {
      return json({ ok: true, service: "yt-upload-spike", plan: "workers-free" });
    }
    if (url.pathname === "/browser-transfer" && request.method === "GET") return browserTransferPage();
    if (!authorized(request, env)) return json({ error: "unauthorized" }, 401);

    if (url.pathname === "/source/generated") return generatedFromRequest(request);
    if (url.pathname.startsWith("/source/")) return handleSource(request, env);
    if (url.pathname === "/sink/sessions" && request.method === "POST") return createSession(request, env);
    if (url.pathname.startsWith("/sink/sessions/")) return proxySession(request, env);
    if (url.pathname === "/spike/purge-r2" && request.method === "POST") return purgeR2(url, env);
    if (url.pathname === "/uploads" && request.method === "POST") return startUpload(request, env);
    if (url.pathname.startsWith("/uploads/") && request.method === "GET") return uploadStatus(request, env);
    if (url.pathname === "/queue/chunk" && request.method === "POST") return enqueueChunk(request, env);
    return json({ error: "not found" }, 404);
  },

  async queue(batch, env): Promise<void> {
    await handleQueueBatch(
      batch.messages as unknown as Array<{ body: ChunkMessage; ack(): void; retry(): void }>,
      env,
    );
  },
} satisfies ExportedHandler<Env>;

async function createSession(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as {
    totalSize?: number;
    storage?: UploadPlan["storage"];
    plan?: UploadPlan;
  };
  const id = crypto.randomUUID();
  const stub = env.SESSIONS.get(env.SESSIONS.idFromName(id));
  const response = await stub.fetch(`${INTERNAL_ORIGIN}/sink/sessions/${id}/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      totalSize: body.totalSize,
      storage: body.storage ?? "auto",
      plan: body.plan ?? null,
    }),
  });
  const payload = (await response.json()) as Record<string, unknown>;
  return json({ id, ...payload }, response.status);
}

async function proxySession(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const parts = url.pathname.split("/");
  const id = parts[3];
  if (!id) return json({ error: "missing session id" }, 400);
  const stub = env.SESSIONS.get(env.SESSIONS.idFromName(id));
  if (request.method === "GET" && !url.pathname.includes("/parts/")) {
    return stub.fetch(`${INTERNAL_ORIGIN}/sink/sessions/${id}/status`);
  }
  return stub.fetch(request);
}

async function startUpload(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as Partial<UploadPlan> & { instanceId?: string };
  try {
    const plan = await resolvePlan(body, env);
    assertChunkSize(plan.chunkSize, plan.allowUnaligned);
    const instanceId = body.instanceId ?? crypto.randomUUID();
    await env.UPLOAD_WORKFLOW.create({ id: instanceId, params: plan });
    return json({ instanceId, sessionId: plan.sessionId, status: "queued" }, 202);
  } catch (error) {
    const message = error instanceof Error ? error.message : "could not start upload";
    return json({ error: message }, 400);
  }
}

async function purgeR2(url: URL, env: Env): Promise<Response> {
  const bucket = "BUCKET" in env ? env.BUCKET : undefined;
  if (!bucket) return json({ deleted: 0, truncated: false });
  const prefix = url.searchParams.get("prefix") || undefined;
  const listed = await bucket.list({ limit: 25, ...(prefix ? { prefix } : {}) });
  for (const object of listed.objects) await bucket.delete(object.key);
  return json({ deleted: listed.objects.length, truncated: listed.truncated });
}

async function resolvePlan(body: Partial<UploadPlan>, env: Env): Promise<UploadPlan> {
  if (body.sinkBaseUrl) {
    assertSafeRemoteUrl(body.sinkBaseUrl);
    if (body.source?.kind === "http") {
      if (!body.source.url) throw new Error("http source requires url");
      assertSafeRemoteUrl(body.source.url);
    }
    if (!body.totalSize || !body.chunkSize || !body.source) {
      throw new Error("totalSize, chunkSize, and source are required");
    }
    const plan = normalize(body);
    plan.sessionId = body.sessionId || crypto.randomUUID();
    return plan;
  }
  if (body.sessionId && body.chunkSize && body.totalSize && body.source) return normalize(body);
  if (body.sessionId && !body.source) {
    const current = await readSession(env, body.sessionId);
    if (!current.plan) throw new Error("session has no stored plan");
    return {
      ...current.plan,
      sessionId: body.sessionId,
      interruptAfterChunks: body.interruptAfterChunks,
      retryLimit: body.retryLimit ?? current.plan.retryLimit,
    };
  }
  if (!body.totalSize || !body.chunkSize || !body.source) {
    throw new Error("totalSize, chunkSize, and source are required");
  }
  const plan = normalize(body);
  plan.sessionId = crypto.randomUUID();
  const stored: UploadPlan = { ...plan, interruptAfterChunks: undefined };
  const created = await initSession(env, plan.sessionId, plan.totalSize, plan.storage, stored);
  if (!created.ok) {
    const payload = (await created.json()) as { error?: string };
    throw new Error(payload.error ?? "session create failed");
  }
  return plan;
}

async function initSession(
  env: Env,
  id: string,
  totalSize: number,
  storage: UploadPlan["storage"],
  plan: UploadPlan,
): Promise<Response> {
  const stub = env.SESSIONS.get(env.SESSIONS.idFromName(id));
  return stub.fetch(`${INTERNAL_ORIGIN}/sink/sessions/${id}/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ totalSize, storage, plan }),
  });
}

function normalize(body: Partial<UploadPlan>): UploadPlan {
  const source = body.source as SourceSpec;
  if (source?.kind === "http" && source.url) assertSafeRemoteUrl(source.url);
  if (body.sinkBaseUrl) assertSafeRemoteUrl(body.sinkBaseUrl);
  return {
    sessionId: body.sessionId ?? "",
    totalSize: body.totalSize ?? 0,
    chunkSize: body.chunkSize ?? 0,
    allowUnaligned: body.allowUnaligned === true,
    storage: body.storage ?? "auto",
    source,
    sinkBaseUrl: body.sinkBaseUrl,
    interruptAfterChunks: body.interruptAfterChunks,
    retryLimit: body.retryLimit,
  };
}

async function readSession(env: Env, id: string): Promise<{ plan: UploadPlan | null }> {
  const response = await proxySession(new Request(`${INTERNAL_ORIGIN}/sink/sessions/${id}`), env);
  if (!response.ok) throw new Error("session not found");
  return (await response.json()) as { plan: UploadPlan | null };
}

async function uploadStatus(request: Request, env: Env): Promise<Response> {
  const id = new URL(request.url).pathname.split("/")[2];
  if (!id) return json({ error: "missing instance id" }, 400);
  const instance = await env.UPLOAD_WORKFLOW.get(id);
  const status = await instance.status();
  return json({
    instanceId: id,
    status: status.status,
    output: status.output ?? null,
    error: status.error ?? null,
  });
}

async function enqueueChunk(request: Request, env: Env): Promise<Response> {
  const body = (await request.json()) as ChunkMessage;
  if (!body.sessionId || !Number.isInteger(body.offset) || !Number.isInteger(body.endInclusive)) {
    return json({ error: "sessionId, offset, and endInclusive are required" }, 400);
  }
  await env.UPLOAD_QUEUE.send(body);
  return json({ queued: true }, 202);
}
