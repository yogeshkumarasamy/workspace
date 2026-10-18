import { DurableObject } from "cloudflare:workers";
import { base64ToBytes, bytesToBase64, sha256Hex } from "./bytes";
import type { Env } from "./env";
import { MEMORY_PART_MAX_BYTES, json, parseContentRange } from "./protocol";

interface SessionRow {
  total: number;
  received: number;
  appended: number;
  duplicate_retries: number;
  storage: string;
  plan: string | null;
  sha256: string | null;
}

interface PartRow {
  start: number;
  end_inclusive: number;
  b64: string | null;
  r2_key: string | null;
}

export class UploadSession extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS session (
        total INTEGER NOT NULL,
        received INTEGER NOT NULL,
        appended INTEGER NOT NULL,
        duplicate_retries INTEGER NOT NULL,
        storage TEXT NOT NULL,
        plan TEXT,
        sha256 TEXT
      )`);
      this.ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS part (
        start INTEGER PRIMARY KEY,
        end_inclusive INTEGER NOT NULL,
        b64 TEXT,
        r2_key TEXT
      )`);
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (request.method === "POST" && url.pathname.endsWith("/init")) return await this.init(request);
      if (request.method === "GET" && url.pathname.endsWith("/status")) return this.statusResponse();
      if (request.method === "GET" && url.pathname.includes("/parts/")) return await this.readPart(url);
      if (request.method === "PUT") return await this.put(request);
      return json({ error: "not found" }, 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : "session error";
      return json({ error: message }, 500);
    }
  }

  private async init(request: Request): Promise<Response> {
    if (this.row()) return json({ error: "session already exists" }, 409);
    const body = (await request.json()) as {
      totalSize?: number;
      storage?: string;
      plan?: unknown;
    };
    if (!Number.isInteger(body.totalSize) || !body.totalSize || body.totalSize < 1) {
      return json({ error: "totalSize must be a positive integer" }, 400);
    }
    const storage = body.storage === "memory" || body.storage === "r2" ? body.storage : "auto";
    this.ctx.storage.sql.exec(
      `INSERT INTO session (total, received, appended, duplicate_retries, storage, plan, sha256)
       VALUES (?, 0, 0, 0, ?, ?, NULL)`,
      body.totalSize,
      storage,
      body.plan === undefined ? null : JSON.stringify(body.plan),
    );
    return json({ ok: true, ...this.publicState() });
  }

  private async put(request: Request): Promise<Response> {
    const row = this.row();
    if (!row) return json({ error: "unknown session" }, 404);
    const range = parseContentRange(request.headers.get("Content-Range"));
    if (!range) return json({ error: "Content-Range must be bytes START-END/TOTAL or bytes */TOTAL" }, 400);
    if (range.total !== row.total) return json({ error: "Content-Range total does not match the session" }, 400);

    if (range.kind === "status") {
      await drainSmall(request);
      return this.resumeResponse(row);
    }

    const length = range.endInclusive - range.start + 1;
    if (length < 1 || range.start < 0) return json({ error: "empty range" }, 400);

    if (range.start > row.received) {
      await drainSmall(request);
      return this.resumeResponse(row);
    }

    if (range.start < row.received) {
      if (range.endInclusive < row.received) {
        await this.drainRetry(request, length);
        this.ctx.storage.sql.exec(
          "UPDATE session SET duplicate_retries = duplicate_retries + 1",
        );
        return this.resumeResponse(this.row()!);
      }
      await this.drainRetry(request, length);
      return json(
        {
          error: "overlapping range rejected so bytes are not duplicated",
          ...this.publicState(),
        },
        409,
      );
    }

    const useR2 = this.wantsR2(row.storage, length);
    if (useR2) {
      if (!this.env.BUCKET) return json({ error: "R2 binding is required for chunks over 256 KiB" }, 500);
      const key = `sessions/${this.sessionKey()}/${range.start}-${range.endInclusive}`;
      const stored = await this.env.BUCKET.put(key, request.body);
      if (!stored || stored.size !== length) {
        if (stored) await this.env.BUCKET.delete(key);
        return json({ error: `stored ${stored?.size ?? 0} bytes, expected ${length}` }, 400);
      }
      this.ctx.storage.sql.exec(
        "INSERT INTO part (start, end_inclusive, b64, r2_key) VALUES (?, ?, NULL, ?)",
        range.start,
        range.endInclusive,
        key,
      );
    } else {
      const bytes = new Uint8Array(await request.arrayBuffer());
      if (bytes.byteLength !== length) {
        return json({ error: `body is ${bytes.byteLength} bytes, expected ${length}` }, 400);
      }
      this.ctx.storage.sql.exec(
        "INSERT INTO part (start, end_inclusive, b64, r2_key) VALUES (?, ?, ?, NULL)",
        range.start,
        range.endInclusive,
        bytesToBase64(bytes),
      );
    }

    const received = range.endInclusive + 1;
    this.ctx.storage.sql.exec(
      "UPDATE session SET received = ?, appended = appended + ?",
      received,
      length,
    );
    const updated = this.row()!;
    if (received === updated.total) await this.finishChecksum(updated);
    console.log(
      JSON.stringify({
        role: "sink",
        event: "put",
        start: range.start,
        endInclusive: range.endInclusive,
        storage: useR2 ? "r2" : "memory",
        received,
      }),
    );
    return this.resumeResponse(this.row()!);
  }

  private wantsR2(storage: string, length: number): boolean {
    if (storage === "r2") return true;
    if (storage === "memory") return false;
    return length > MEMORY_PART_MAX_BYTES;
  }

  private async finishChecksum(row: SessionRow): Promise<void> {
    const parts = this.parts();
    if (parts.some((part) => part.r2_key)) return;
    const out = new Uint8Array(row.total);
    let cursor = 0;
    for (const part of parts) {
      const bytes = base64ToBytes(part.b64 ?? "");
      out.set(bytes, cursor);
      cursor += bytes.byteLength;
    }
    if (cursor !== row.total) return;
    const digest = await sha256Hex(out);
    this.ctx.storage.sql.exec("UPDATE session SET sha256 = ?", digest);
  }

  private async readPart(url: URL): Promise<Response> {
    const start = Number(url.pathname.split("/parts/")[1]);
    const part = this.parts().find((item) => item.start === start);
    if (!part) return json({ error: "unknown part" }, 404);
    if (part.b64) {
      const bytes = base64ToBytes(part.b64);
      return new Response(bytes, {
        headers: {
          "Content-Type": "application/octet-stream",
          "Content-Length": String(bytes.byteLength),
        },
      });
    }
    if (!part.r2_key || !this.env.BUCKET) return json({ error: "part body is missing" }, 500);
    const object = await this.env.BUCKET.get(part.r2_key);
    if (!object) return json({ error: "r2 part missing" }, 500);
    return new Response(object.body, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(object.size),
      },
    });
  }

  private resumeResponse(row: SessionRow): Response {
    const headers = new Headers();
    if (row.received > 0) headers.set("Range", `bytes=0-${row.received - 1}`);
    const complete = row.received === row.total;
    return json(this.publicState(), complete ? 200 : 308, headers);
  }

  private statusResponse(): Response {
    const row = this.row();
    if (!row) return json({ error: "unknown session" }, 404);
    return json(this.publicState());
  }

  private publicState(): Record<string, unknown> {
    const row = this.row();
    if (!row) return { received: 0 };
    const parts = this.parts();
    return {
      received: row.received,
      total: row.total,
      complete: row.received === row.total,
      appended: row.appended,
      duplicateRetries: row.duplicate_retries,
      partCount: parts.length,
      parts: parts.map((part) => ({ start: part.start, end: part.end_inclusive })),
      sha256: row.sha256,
      storage: row.storage,
      plan: row.plan ? (JSON.parse(row.plan) as unknown) : null,
    };
  }

  private async drainRetry(request: Request, length: number): Promise<void> {
    if (!request.body) return;
    if (length > MEMORY_PART_MAX_BYTES && this.env.BUCKET) {
      const key = `trash/${crypto.randomUUID()}`;
      await this.env.BUCKET.put(key, request.body);
      await this.env.BUCKET.delete(key);
      return;
    }
    await request.arrayBuffer();
  }

  private sessionKey(): string {
    return this.ctx.id.toString();
  }

  private row(): SessionRow | null {
    const rows = this.ctx.storage.sql
      .exec(
        "SELECT total, received, appended, duplicate_retries, storage, plan, sha256 FROM session",
      )
      .toArray() as unknown as SessionRow[];
    return rows[0] ?? null;
  }

  private parts(): PartRow[] {
    return this.ctx.storage.sql
      .exec("SELECT start, end_inclusive, b64, r2_key FROM part ORDER BY start")
      .toArray() as unknown as PartRow[];
  }
}

async function drainSmall(request: Request): Promise<void> {
  if (request.body) await request.arrayBuffer();
}
