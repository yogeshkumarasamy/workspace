/**
 * Local Range source and resumable sink for the no-R2 fallback.
 * Binds to 127.0.0.1 only. A tunnel process, when used, is the only public path.
 */
import { createHash, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CONTENT_RANGE = /^bytes (\d+)-(\d+)\/(\d+)$/;
const STATUS_RANGE = /^bytes \*\/(\d+)$/;
const RANGE_HEADER = /^bytes=(\d+)-(\d+)$/;

export async function startRangeFixture({ filePath, totalSize }) {
  const token = randomBytes(16).toString("hex");
  const sessions = new Map();
  let rootPromise;

  async function sessionDir(id) {
    if (!rootPromise) rootPromise = mkdtemp(join(tmpdir(), "yt-spike-fixture-"));
    const root = await rootPromise;
    const dir = join(root, id);
    await mkdir(dir, { recursive: true });
    return dir;
  }

  function getSession(id, total) {
    let session = sessions.get(id);
    if (!session) {
      session = {
        total,
        received: 0,
        appended: 0,
        duplicateRetries: 0,
        partCount: 0,
        complete: false,
        sha256: null,
        running: createHash("sha256"),
      };
      sessions.set(id, session);
    }
    if (session.total !== total) throw Object.assign(new Error("total mismatch"), { status: 400 });
    return session;
  }

  const server = createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] !== token) {
      send(response, 404, { error: "not found" });
      return;
    }
    if (request.method === "GET" && parts[1] === "source") {
      serveSource(request, response);
      return;
    }
    if (parts[1] === "sessions" && parts[2] && request.method === "PUT") {
      void serveSink(parts[2], request, response).catch((error) => {
        const status = error.status ?? 500;
        send(response, status, { error: error instanceof Error ? error.message : "sink error" });
      });
      return;
    }
    send(response, 404, { error: "not found" });
  });

  function serveSource(request, response) {
    const match = RANGE_HEADER.exec(request.headers.range ?? "");
    if (!match) {
      send(response, 400, { error: "Range required" });
      return;
    }
    const start = Number(match[1]);
    const endInclusive = Number(match[2]);
    if (start < 0 || endInclusive < start || endInclusive >= totalSize) {
      send(response, 416, { error: "range not satisfiable" });
      return;
    }
    const length = endInclusive - start + 1;
    response.writeHead(206, {
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${start}-${endInclusive}/${totalSize}`,
      "Content-Length": String(length),
      "Content-Type": "application/octet-stream",
    });
    createReadStream(filePath, { start, end: endInclusive }).pipe(response);
  }

  async function serveSink(id, request, response) {
    const header = request.headers["content-range"];
    if (typeof header !== "string") {
      await drain(request);
      send(response, 400, { error: "Content-Range required" });
      return;
    }
    const status = STATUS_RANGE.exec(header.trim());
    if (status) {
      await drain(request);
      const session = getSession(id, Number(status[1]));
      resume(response, session);
      return;
    }
    const match = CONTENT_RANGE.exec(header.trim());
    if (!match) {
      await drain(request);
      send(response, 400, { error: "unreadable Content-Range" });
      return;
    }
    const start = Number(match[1]);
    const endInclusive = Number(match[2]);
    const total = Number(match[3]);
    const session = getSession(id, total);
    const length = endInclusive - start + 1;
    if (start > session.received) {
      await drain(request);
      resume(response, session);
      return;
    }
    if (start < session.received) {
      await drain(request);
      if (endInclusive < session.received) {
        session.duplicateRetries += 1;
        resume(response, session);
        return;
      }
      send(response, 409, { error: "overlapping range rejected", ...publicState(session) });
      return;
    }
    const dir = await sessionDir(id);
    const file = join(dir, String(start));
    const written = await writeBody(request, file);
    if (written !== length) {
      send(response, 400, { error: `body is ${written} bytes, expected ${length}` });
      return;
    }
    await hashFileInto(file, session.running);
    session.received = endInclusive + 1;
    session.appended += length;
    session.partCount += 1;
    session.complete = session.received === session.total;
    if (session.complete) session.sha256 = session.running.digest("hex");
    resume(response, session);
  }

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("fixture server failed to bind");

  return {
    port: address.port,
    token,
    basePath: `/${token}`,
    session(id) {
      return sessions.get(id) ?? null;
    },
    async close() {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
      if (rootPromise) {
        const root = await rootPromise;
        await rm(root, { recursive: true, force: true });
      }
    },
  };
}

function publicState(session) {
  return {
    received: session.received,
    total: session.total,
    complete: session.received === session.total,
    appended: session.appended,
    duplicateRetries: session.duplicateRetries,
    partCount: session.partCount,
    sha256: session.sha256,
  };
}

function resume(response, session) {
  const headers = { "Content-Type": "application/json" };
  if (session.received > 0) headers.Range = `bytes=0-${session.received - 1}`;
  const complete = session.received === session.total;
  response.writeHead(complete ? 200 : 308, headers);
  response.end(JSON.stringify(publicState(session)));
}

function send(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

function drain(request) {
  return new Promise((resolve, reject) => {
    request.on("data", () => {});
    request.on("end", resolve);
    request.on("error", reject);
  });
}

function writeBody(request, file) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const out = createWriteStream(file);
    const fail = (error) => {
      out.destroy();
      reject(error);
    };
    request.on("data", (chunk) => {
      size += chunk.length;
      if (!out.write(chunk)) request.pause();
    });
    out.on("drain", () => request.resume());
    request.on("end", () => out.end(() => resolve(size)));
    request.on("error", fail);
    out.on("error", fail);
  });
}

function hashFileInto(file, hash) {
  return new Promise((resolve, reject) => {
    const stream = createReadStream(file);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", resolve);
    stream.on("error", reject);
  });
}
