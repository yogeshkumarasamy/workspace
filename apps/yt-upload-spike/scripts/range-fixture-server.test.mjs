import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { checksumMatches } from "./measure-plan.mjs";
import { startRangeFixture } from "./range-fixture-server.mjs";

test("serves ranges and resumes a sink without duplicating bytes", async () => {
  const dir = await mkdtemp(join(tmpdir(), "yt-fixture-"));
  const filePath = join(dir, "source.bin");
  const bytes = Buffer.from("abcdefghijklmnopqrstuvwxyz012345");
  await writeFile(filePath, bytes);
  const fixture = await startRangeFixture({ filePath, totalSize: bytes.length });
  try {
    const origin = `http://127.0.0.1:${fixture.port}${fixture.basePath}`;
    const source = await fetch(`${origin}/source`, { headers: { Range: "bytes=0-3" } });
    assert.equal(source.status, 206);
    assert.equal(Buffer.from(await source.arrayBuffer()).toString(), "abcd");

    const session = "s1";
    const sink = `${origin}/sessions/${session}`;
    const status = await fetch(sink, {
      method: "PUT",
      headers: { "Content-Range": `bytes */${bytes.length}`, "Content-Length": "0" },
    });
    assert.equal(status.status, 308);

    async function put(start, end) {
      const slice = bytes.subarray(start, end + 1);
      return fetch(sink, {
        method: "PUT",
        headers: {
          "Content-Range": `bytes ${start}-${end}/${bytes.length}`,
          "Content-Length": String(slice.length),
        },
        body: slice,
        duplex: "half",
      });
    }

    const first = await put(0, 15);
    assert.equal(first.status, 308);
    const again = await put(0, 15);
    assert.equal(again.status, 308);
    const done = await put(16, bytes.length - 1);
    assert.equal(done.status, 200);
    const state = fixture.session(session);
    assert.ok(state);
    assert.equal(state.received, bytes.length);
    assert.equal(state.appended, bytes.length);
    assert.equal(state.duplicateRetries, 1);
    assert.equal(state.sha256, createHash("sha256").update(bytes).digest("hex"));
  } finally {
    await fixture.close();
  }
});

test("16 MiB and smaller ranges checksum, and stopping after 16 parts is unfinished rather than a mismatch", async () => {
  const dir = await mkdtemp(join(tmpdir(), "yt-fixture-mib-"));
  const filePath = join(dir, "source.bin");
  const chunk = 16 * 1024 * 1024;
  const total = chunk + 1024 * 1024;
  const expected = createHash("sha256");
  const { createWriteStream } = await import("node:fs");
  const stream = createWriteStream(filePath);
  let left = total;
  let seed = 1;
  while (left > 0) {
    const size = Math.min(1024 * 1024, left);
    const block = Buffer.alloc(size, seed);
    expected.update(block);
    if (!stream.write(block)) await new Promise((resolve) => stream.once("drain", resolve));
    seed = (seed + 1) % 251;
    left -= size;
  }
  await new Promise((resolve, reject) => stream.end((error) => (error ? reject(error) : resolve())));
  const fileSha = expected.digest("hex");
  const fixture = await startRangeFixture({ filePath, totalSize: total });
  try {
    const origin = `http://127.0.0.1:${fixture.port}${fixture.basePath}`;
    const sink = `${origin}/sessions/wide`;
    const { open } = await import("node:fs/promises");
    const handle = await open(filePath, "r");
    async function putFile(start, end) {
      const length = end - start + 1;
      const body = Buffer.alloc(length);
      await handle.read(body, 0, length, start);
      return fetch(sink, {
        method: "PUT",
        headers: {
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Content-Length": String(length),
        },
        body,
      });
    }
    const first = await putFile(0, chunk - 1);
    assert.equal(first.status, 308);
    const tail = await putFile(chunk, total - 1);
    assert.equal(tail.status, 200);
    await handle.close();
    const wide = fixture.session("wide");
    assert.equal(wide.received, total);
    assert.equal(wide.sha256, fileSha);
    assert.equal(checksumMatches({ complete: true, actualSha: wide.sha256, expectedSha: fileSha }), true);

    const part = 1024;
    const parts = 20;
    const smallTotal = part * parts;
    const small = createHash("sha256");
    const smallSink = `${origin}/sessions/stopped`;
    for (let index = 0; index < 16; index += 1) {
      const body = Buffer.alloc(part, index + 1);
      small.update(body);
      const response = await fetch(smallSink, {
        method: "PUT",
        headers: {
          "Content-Range": `bytes ${index * part}-${index * part + part - 1}/${smallTotal}`,
          "Content-Length": String(part),
        },
        body,
      });
      assert.equal(response.status, 308);
    }
    const stopped = fixture.session("stopped");
    assert.equal(stopped.received, 16 * part);
    assert.equal(stopped.partCount, 16);
    assert.equal(stopped.complete, false);
    assert.equal(stopped.sha256, null);
    assert.equal(checksumMatches({ complete: false, actualSha: stopped.sha256, expectedSha: fileSha }), null);

    for (let index = 16; index < parts; index += 1) {
      const body = Buffer.alloc(part, index + 1);
      small.update(body);
      const response = await fetch(smallSink, {
        method: "PUT",
        headers: {
          "Content-Range": `bytes ${index * part}-${index * part + part - 1}/${smallTotal}`,
          "Content-Length": String(part),
        },
        body,
      });
      assert.equal(response.status, index === parts - 1 ? 200 : 308);
    }
    const finished = fixture.session("stopped");
    const finishedSha = small.digest("hex");
    assert.equal(finished.received, smallTotal);
    assert.equal(finished.sha256, finishedSha);
    assert.equal(checksumMatches({ complete: true, actualSha: finished.sha256, expectedSha: finishedSha }), true);
  } finally {
    await fixture.close();
  }
});
