#!/usr/bin/env node
/**
 * Deploy the spike to a Workers Free account and measure one ~500 MiB upload.
 * Exits 2 before any deploy when credentials are missing. Never invents CPU numbers.
 */
import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { collectCpuSamples, shouldResumeInstance, telemetryQueryBody } from "./measure-plan.mjs";

const APP_DIR = fileURLToPath(new URL("..", import.meta.url));
const LONG_VIDEO_BYTES = 500 * 1024 * 1024;

export const REQUIREMENTS = `
No CPU measurement was run. This script does not invent CPU milliseconds.

Provide these, then run the script again from apps/yt-upload-spike:

  pnpm measure
  pnpm measure -- --source drive --chunk-mib 64

1. Cloudflare account on the Workers Free plan.
   Workers Paid ($5/mo) is out of scope. A Paid account's higher CPU cap would not answer Y0.
   Account ID: dash.cloudflare.com → the account → Workers overview. The id is in the URL:
   https://dash.cloudflare.com/<account-id>/workers/overview
   Export it as CLOUDFLARE_ACCOUNT_ID.

2. Cloudflare API token (CLOUDFLARE_API_TOKEN), custom token, this account only:
   - Account / Workers Scripts / Edit
   - Account / Workers Tail / Read
   - Account / Workers Observability / Read
   - Account / Workers R2 Storage / Edit
   - Account / Queues / Edit
   - Account / Account Settings / Read
   The script deploys a worker named yt-upload-spike, creates R2 bucket yt-upload-spike
   and queue yt-upload-spike-chunks, and reads Workers Logs. It does not deploy
   yt-scheduler, Innings Break, or anything in deploy/targets.json.

3. Source file, one of:

   A. R2 stand-in (default, no Drive token). The script writes a 500 MiB file on this
      machine, uploads it to the spike bucket, and the Workflow reads Range slices from R2.
      That exercises Worker streaming CPU. It does not exercise Google Drive.

   B. Google Drive (--source drive), which is the production-shaped source.
      - Put a file of about 500 MB in Drive (the script's own fixture is 500 MiB /
        524,288,000 bytes). A file within roughly 400–600 MB still answers the question.
      - Enable the Google Drive API on a Cloud project.
      - Create an OAuth client (Desktop) if you cannot use the OAuth Playground client.
      - Open https://developers.google.com/oauthplayground/
        Gear → Use your own OAuth credentials if the file is private.
        Scope: https://www.googleapis.com/auth/drive.readonly
        Authorize, exchange the code, copy the access token (about one hour).
      - File id: the segment between /d/ and / in
        https://drive.google.com/file/d/<file-id>/view
      - Export DRIVE_FILE_ID and DRIVE_ACCESS_TOKEN.
      - Share is not required if the token is for the account that owns the file.
        The token is stored as a Worker secret for the run. It is not written to git.

The script prints Workers Logs cpuTimeMs for uploader steps when the API returns them.
If the log query is empty or rejected, it says so and still does not fill in a number.

GitHub Actions, with no local secrets: Actions → "Y0 Workers Free CPU measure" → Run workflow.
That workflow is manual only. It uses the repository secrets CLOUDFLARE_API_TOKEN and
CLOUDFLARE_ACCOUNT_ID, deploys the throwaway worker yt-spike-gha-throwaway, measures a
500 MiB R2 stand-in (or a runner-hosted fixture if R2 cannot be created), and deletes
the Worker, Workflow, and R2 bucket afterward. It does not call YouTube.
`.trim();

export function parseArgs(argv) {
  const args = {
    source: "r2",
    chunkMib: 64,
    bytes: LONG_VIDEO_BYTES,
    out: process.env.MEASURE_OUT || join(tmpdir(), "yt-upload-spike-measure.json"),
    help: false,
    sweep: false,
    teardownOnly: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    // pnpm --filter <pkg> <script> -- <args> forwards the separator itself.
    if (flag === "--") continue;
    if (flag === "--help" || flag === "-h") args.help = true;
    else if (flag === "--source") args.source = argv[++i] ?? "";
    else if (flag === "--chunk-mib") args.chunkMib = Number(argv[++i]);
    else if (flag === "--bytes") args.bytes = Number(argv[++i]);
    else if (flag === "--out") args.out = argv[++i] ?? args.out;
    else if (flag === "--sweep") args.sweep = true;
    else if (flag === "--teardown-only") args.teardownOnly = true;
    else throw new Error(`unknown argument ${flag}`);
  }
  if (args.source !== "r2" && args.source !== "drive") {
    throw new Error("--source must be r2 or drive");
  }
  return args;
}

export function missingRequirements(env, args = { source: "r2" }) {
  const missing = [];
  if (!env.CLOUDFLARE_ACCOUNT_ID) missing.push("CLOUDFLARE_ACCOUNT_ID");
  if (!env.CLOUDFLARE_API_TOKEN) missing.push("CLOUDFLARE_API_TOKEN");
  if (args.source === "drive") {
    if (!env.DRIVE_FILE_ID) missing.push("DRIVE_FILE_ID");
    if (!env.DRIVE_ACCESS_TOKEN) missing.push("DRIVE_ACCESS_TOKEN");
  }
  return missing;
}

function run(args, { input } = {}) {
  return spawnSync("pnpm", ["exec", ...args], {
    cwd: APP_DIR,
    encoding: "utf8",
    env: process.env,
    input,
  });
}

function requireOk(result, what) {
  if (result.status === 0) return;
  const detail = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.trim();
  throw new Error(`${what} failed (exit ${result.status}): ${detail}`);
}

async function writeMeasuredFile(bytes) {
  const dir = await mkdtemp(join(tmpdir(), "yt-upload-spike-"));
  const path = join(dir, "source.bin");
  const hash = createHash("sha256");
  const stream = createWriteStream(path);
  let left = bytes;
  const stride = 8 * 1024 * 1024;
  while (left > 0) {
    const chunk = randomBytes(Math.min(stride, left));
    hash.update(chunk);
    if (!stream.write(chunk)) await new Promise((resolve) => stream.once("drain", resolve));
    left -= chunk.byteLength;
  }
  await new Promise((resolve, reject) => {
    stream.end((error) => (error ? reject(error) : resolve()));
  });
  return { path, sha256: hash.digest("hex"), bytes };
}

function workerUrlFromDeploy(output) {
  const match = output.match(/https:\/\/yt-upload-spike\.[a-z0-9-]+\.workers\.dev/);
  if (!match) throw new Error("deploy succeeded but the workers.dev URL was not in the output");
  return match[0];
}

async function driveMetadata(fileId, token) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,size,md5Checksum`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const body = await response.json();
  if (!response.ok) throw new Error(`Drive metadata ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

async function queryLogs(accountId, token, from, to) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/observability/telemetry/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(telemetryQueryBody("yt-upload-spike", from, to)),
    },
  );
  const body = await response.json();
  return { httpStatus: response.status, body };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(REQUIREMENTS);
    return;
  }
  if (args.teardownOnly || args.sweep) {
    const { runSweep, teardownThrowaway } = await import("./sweep.mjs");
    if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
      console.error(REQUIREMENTS);
      console.error("\nMissing: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN");
      process.exitCode = 2;
      return;
    }
    if (args.teardownOnly) {
      const torn = await teardownThrowaway();
      console.log(torn.lines.join("\n"));
      process.exitCode = torn.failed ? 1 : 0;
      return;
    }
    const chunkBytes = args.chunkMib * 1024 * 1024;
    process.exitCode = await runSweep({
      bytes: args.bytes,
      startChunkBytes: chunkBytes,
      out: args.out,
      summaryPath: process.env.GITHUB_STEP_SUMMARY,
    });
    return;
  }
  const missing = missingRequirements(process.env, args);
  if (missing.length) {
    console.error(REQUIREMENTS);
    console.error(`\nMissing: ${missing.join(", ")}`);
    process.exitCode = 2;
    return;
  }

  const chunkBytes = args.chunkMib * 1024 * 1024;
  if (!Number.isInteger(chunkBytes) || chunkBytes < 256 * 1024 || chunkBytes % (256 * 1024) !== 0) {
    throw new Error("--chunk-mib must make a whole number of 256 KiB units, at least 0.25");
  }
  if (chunkBytes > 64 * 1024 * 1024) throw new Error("--chunk-mib must be <= 64");

  console.log("Confirm this Cloudflare account is Workers Free before trusting any CPU figure.");
  const spikeToken = randomBytes(24).toString("hex");
  const startedAt = Date.now();

  const bucket = run(["wrangler", "r2", "bucket", "create", "yt-upload-spike"]);
  if (bucket.status !== 0 && !/already exists/i.test(`${bucket.stdout}\n${bucket.stderr}`)) {
    requireOk(bucket, "r2 bucket create");
  }
  const queue = run(["wrangler", "queues", "create", "yt-upload-spike-chunks"]);
  if (queue.status !== 0 && !/already/i.test(`${queue.stdout}\n${queue.stderr}`)) {
    requireOk(queue, "queue create");
  }
  requireOk(run(["wrangler", "secret", "put", "SPIKE_TOKEN"], { input: `${spikeToken}\n` }), "secret put");

  let totalSize = args.bytes;
  let localSha = null;
  /** @type {Record<string, unknown>} */
  const source = { kind: "r2", key: "source.bin" };
  if (args.source === "drive") {
    const meta = await driveMetadata(process.env.DRIVE_FILE_ID, process.env.DRIVE_ACCESS_TOKEN);
    totalSize = Number(meta.size);
    requireOk(
      run(["wrangler", "secret", "put", "DRIVE_ACCESS_TOKEN"], {
        input: `${process.env.DRIVE_ACCESS_TOKEN}\n`,
      }),
      "drive secret",
    );
    source.kind = "http";
    source.url = `https://www.googleapis.com/drive/v3/files/${process.env.DRIVE_FILE_ID}?alt=media&supportsAllDrives=true`;
    source.authorize = "drive";
    delete source.key;
    console.log(`Drive file ${meta.name} is ${totalSize} bytes.`);
  } else {
    console.log(`Writing ${totalSize} bytes locally, then uploading to R2.`);
    const file = await writeMeasuredFile(totalSize);
    localSha = file.sha256;
    requireOk(
      run(["wrangler", "r2", "object", "put", "yt-upload-spike/source.bin", `--file=${file.path}`, "--remote"]),
      "r2 object put",
    );
  }

  const deployed = run(["wrangler", "deploy"]);
  requireOk(deployed, "wrangler deploy");
  const base = workerUrlFromDeploy(`${deployed.stdout}\n${deployed.stderr}`);
  console.log(base);
  const auth = { Authorization: `Bearer ${spikeToken}`, "Content-Type": "application/json" };

  const instances = [];
  let sessionId = null;
  let guard = 0;
  while (guard < 200) {
    guard += 1;
    const body = sessionId
      ? { sessionId }
      : { totalSize, chunkSize: chunkBytes, storage: "r2", source };
    const response = await fetch(`${base}/uploads`, { method: "POST", headers: auth, body: JSON.stringify(body) });
    const payload = await response.json();
    if (!response.ok) throw new Error(`start failed ${response.status}: ${JSON.stringify(payload)}`);
    sessionId = payload.sessionId;
    const finished = await poll(base, auth, payload.instanceId);
    instances.push({ instanceId: payload.instanceId, status: finished });
    if (finished.output?.complete === true || finished.output?.reason === "complete") break;
    if (!shouldResumeInstance(finished)) break;
  }

  const sessionResponse = await fetch(`${base}/sink/sessions/${sessionId}`, { headers: auth });
  const session = await sessionResponse.json();
  let downloadedSha = null;
  if (session.complete && Array.isArray(session.parts)) {
    const hash = createHash("sha256");
    for (const part of session.parts) {
      const partResponse = await fetch(`${base}/sink/sessions/${sessionId}/parts/${part.start}`, { headers: auth });
      if (!partResponse.ok) throw new Error(`part ${part.start} download ${partResponse.status}`);
      hash.update(Buffer.from(await partResponse.arrayBuffer()));
    }
    downloadedSha = hash.digest("hex");
  }

  const logs = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const queried = await queryLogs(process.env.CLOUDFLARE_ACCOUNT_ID, process.env.CLOUDFLARE_API_TOKEN, startedAt - 60_000, Date.now());
    logs.push(queried);
    const samples = collectCpuSamples(queried.body);
    if (queried.httpStatus === 200 && samples.length) break;
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  const samples = collectCpuSamples(logs.at(-1)?.body);
  const result = {
    measured: samples.length > 0,
    base,
    source: args.source,
    totalSize,
    chunkBytes,
    localSha256: localSha,
    downloadedSha256: downloadedSha,
    checksumMatches: localSha ? downloadedSha === localSha : null,
    session: {
      complete: session.complete ?? false,
      received: session.received ?? null,
      appended: session.appended ?? null,
      duplicateRetries: session.duplicateRetries ?? null,
      sha256: session.sha256 ?? null,
    },
    instances,
    cpuTimeMs: samples.map((sample) => sample.cpuTimeMs),
    cpuTimeMsMax: samples.length ? Math.max(...samples.map((sample) => sample.cpuTimeMs)) : null,
    freePlanCpuMs: 10,
    logQueryHttpStatus: logs.at(-1)?.httpStatus ?? null,
    note:
      samples.length > 0
        ? "cpuTimeMs values are the Workers Logs field of that name for events that include an uploader chunk log. They are not estimates."
        : "Workers Logs did not return cpuTimeMs for uploader events. No CPU figure is reported.",
  };
  await writeFile(args.out, JSON.stringify({ result, lastLogQuery: logs.at(-1) ?? null }, null, 2));
  console.log(JSON.stringify(result, null, 2));
  console.log(`Full log payload: ${args.out}`);
  console.log(`Spike bearer for /browser-transfer (not the Cloudflare token): ${spikeToken}`);
  if (!samples.length) process.exitCode = session.complete ? 3 : 1;
  else if (!session.complete) process.exitCode = 1;
}

async function poll(base, auth, instanceId) {
  const deadline = Date.now() + 30 * 60 * 1000;
  while (Date.now() < deadline) {
    const response = await fetch(`${base}/uploads/${instanceId}`, { headers: auth });
    const body = await response.json();
    if (body.status === "complete" || body.status === "errored" || body.status === "terminated") return body;
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error(`instance ${instanceId} did not finish within 30 minutes`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = process.exitCode && process.exitCode !== 0 ? process.exitCode : 1;
  });
}
