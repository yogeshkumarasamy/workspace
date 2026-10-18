import {
  WorkflowEntrypoint,
  type WorkflowEvent,
  type WorkflowStep,
  type WorkflowStepConfig,
} from "cloudflare:workers";
import { NonRetryableError } from "cloudflare:workflows";
import { FREE_PLAN } from "./budget";
import type { Env } from "./env";
import { sinkUrl, sourceUrl, type UploadPlan } from "./protocol";
import { queryStatus, transferChunk, type ChunkFetcher } from "./transfer";

export function makeFetcher(env: Env, plan: UploadPlan): ChunkFetcher {
  return {
    async fetch(url: string, init?: RequestInit) {
      const headers = new Headers(init?.headers);
      if (env.SPIKE_TOKEN && url.startsWith("https://yt-upload-spike.internal")) {
        headers.set("Authorization", `Bearer ${env.SPIKE_TOKEN}`);
      }
      if (plan.source.authorize === "drive" && !url.startsWith("https://yt-upload-spike.internal")) {
        if (!env.DRIVE_ACCESS_TOKEN) throw new Error("DRIVE_ACCESS_TOKEN is not set on the Worker");
        headers.set("Authorization", `Bearer ${env.DRIVE_ACCESS_TOKEN}`);
      }
      const next = { ...init, headers } as RequestInit;
      if (url.startsWith("https://yt-upload-spike.internal")) return env.API.fetch(url, next);
      return fetch(url, next);
    },
  };
}

export async function uploadExactChunk(
  env: Env,
  plan: UploadPlan,
  offset: number,
  endInclusive: number,
): Promise<{ received: number; status: number; skipped: boolean }> {
  const fetcher = makeFetcher(env, plan);
  const sink = sinkUrl(plan.sessionId);
  const status = await queryStatus(fetcher, sink, plan.totalSize);
  if (status.complete || status.received > endInclusive) {
    return { received: status.received, status: status.complete ? 200 : 308, skipped: true };
  }
  if (status.received !== offset) {
    throw new Error(`sink cursor ${status.received} does not match step offset ${offset}`);
  }
  const result = await transferChunk({
    fetcher,
    sourceUrl: sourceUrl(plan),
    sinkUrl: sink,
    offset,
    endInclusive,
    totalSize: plan.totalSize,
  });
  console.log(
    JSON.stringify({
      role: "uploader",
      event: "chunk",
      offset,
      endInclusive,
      chunkBytes: endInclusive - offset + 1,
      httpStatus: result.status,
      received: result.received,
      skipped: false,
    }),
  );
  return { received: result.received, status: result.status, skipped: false };
}

function stepConfig(plan: UploadPlan): WorkflowStepConfig {
  return {
    retries: {
      limit: plan.retryLimit ?? 2,
      delay: "1 second",
      backoff: "constant",
    },
    timeout: "15 minutes",
  };
}

export class UploadWorkflow extends WorkflowEntrypoint<Env, UploadPlan> {
  async run(event: WorkflowEvent<UploadPlan>, step: WorkflowStep) {
    const plan = event.payload;
    const config = stepConfig(plan);
    const fetcher = makeFetcher(this.env, plan);
    let used = 0;
    const status = await step.do<{ received: number; complete: boolean }>("status", config, async () => {
      return queryStatus(fetcher, sinkUrl(plan.sessionId), plan.totalSize);
    });
    used += 1;
    let offset = status.received;
    let chunks = 0;
    while (offset < plan.totalSize) {
      if (used >= FREE_PLAN.workflowStepsPerInstanceBudget) {
        return { complete: false, received: offset, chunks, reason: "instance-step-budget" };
      }
      const endInclusive = Math.min(offset + plan.chunkSize, plan.totalSize) - 1;
      const outcome = await step.do<{ received: number; status: number; skipped: boolean }>(
        `chunk-${offset}`,
        config,
        async () => uploadExactChunk(this.env, plan, offset, endInclusive),
      );
      used += 1;
      if (outcome.received <= offset) {
        throw new NonRetryableError(`chunk at ${offset} did not advance the sink`);
      }
      offset = outcome.received;
      chunks += 1;
      if (plan.interruptAfterChunks && chunks >= plan.interruptAfterChunks) {
        await step.do("forced-interruption", config, async () => {
          throw new NonRetryableError("forced interruption");
        });
      }
    }
    return { complete: true, received: offset, chunks, reason: "complete" };
  }
}
