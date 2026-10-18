import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { missingRequirements, parseArgs } from "./deploy-and-measure.mjs";

const script = fileURLToPath(new URL("./deploy-and-measure.mjs", import.meta.url));

test("lists the credentials Y0 still needs and does not invent CPU milliseconds", () => {
  assert.deepEqual(missingRequirements({}), ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"]);
  assert.deepEqual(missingRequirements({ CLOUDFLARE_ACCOUNT_ID: "acct", CLOUDFLARE_API_TOKEN: "tok" }, { source: "drive" }), [
    "DRIVE_FILE_ID",
    "DRIVE_ACCESS_TOKEN",
  ]);

  const result = spawnSync(process.execPath, [script], {
    env: { PATH: process.env.PATH ?? "" },
    encoding: "utf8",
  });
  assert.equal(result.status, 2);
  const text = `${result.stdout}${result.stderr}`;
  assert.match(text, /No CPU measurement was run/);
  assert.match(text, /CLOUDFLARE_ACCOUNT_ID/);
  assert.match(text, /Workers Scripts \/ Edit/);
  assert.match(text, /Workers R2 Storage \/ Edit/);
  assert.match(text, /DRIVE_FILE_ID/);
  assert.match(text, /drive\.readonly/);
  assert.match(text, /500 MiB/);
  assert.doesNotMatch(text, /cpuTimeMsMax":\s*\d+/);
});

test("ignores the -- separator pnpm forwards to the measure script", () => {
  const swept = parseArgs(["--", "--sweep", "--bytes", "524288000", "--chunk-mib", "64"]);
  assert.equal(swept.sweep, true);
  assert.equal(swept.teardownOnly, false);
  assert.equal(swept.bytes, 524288000);
  assert.equal(swept.chunkMib, 64);

  const torn = parseArgs(["--", "--teardown-only"]);
  assert.equal(torn.teardownOnly, true);
  assert.equal(torn.sweep, false);

  assert.throws(() => parseArgs(["--nope"]), /unknown argument --nope/);

  for (const args of [
    ["--", "--sweep", "--bytes", "524288000", "--chunk-mib", "64"],
    ["--", "--teardown-only"],
  ]) {
    const result = spawnSync(process.execPath, [script, ...args], {
      env: { PATH: process.env.PATH ?? "" },
      encoding: "utf8",
    });
    const text = `${result.stdout}${result.stderr}`;
    assert.equal(result.status, 2, text);
    assert.match(text, /No CPU measurement was run/);
    assert.doesNotMatch(text, /unknown argument/);
    assert.doesNotMatch(text, /cpuTimeMsMax":\s*\d+/);
  }
});
