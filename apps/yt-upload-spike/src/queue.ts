import type { Env } from "./env";
import type { SourceSpec, UploadPlan } from "./protocol";
import { uploadExactChunk } from "./workflow";

export interface ChunkMessage {
  sessionId: string;
  totalSize: number;
  offset: number;
  endInclusive: number;
  source: SourceSpec;
}

export async function handleQueueBatch(
  messages: Array<{ body: ChunkMessage; ack(): void; retry(): void }>,
  env: Env,
): Promise<void> {
  for (const message of messages) {
    const plan: UploadPlan = {
      sessionId: message.body.sessionId,
      totalSize: message.body.totalSize,
      chunkSize: message.body.endInclusive - message.body.offset + 1,
      allowUnaligned: true,
      storage: "auto",
      source: message.body.source,
      retryLimit: 0,
    };
    try {
      await uploadExactChunk(env, plan, message.body.offset, message.body.endInclusive);
      message.ack();
    } catch (error) {
      console.log(
        JSON.stringify({
          role: "queue",
          event: "retry",
          offset: message.body.offset,
          error: error instanceof Error ? error.message : "queue chunk failed",
        }),
      );
      message.retry();
    }
  }
}
