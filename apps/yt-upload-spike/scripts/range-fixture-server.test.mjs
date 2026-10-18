import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
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
