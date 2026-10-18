/**
 * Deploy the throwaway Worker, sweep chunk sizes, and delete everything created.
 * Never calls YouTube. Never invents cpuTimeMs.
 */
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { createWriteStream } from "node:fs";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertSafeRemoteUrl,
  assertThrowawayName,
  cloudflaredUrl,
  collectCpuSamples,
  COMPATIBILITY_DATE,
  decideNext,
  exitCodeFor,
  isIgnorableTeardown,
  LONG_VIDEO_BYTES,
  namespaceIsThrowaway,
  planSweep,
  r2Unavailable,
  renderSummary,
  teardownCommands,
  telemetryQueryBody,
  THROWAWAY_WORKER_NAME,
  throwawayConfig,
  workerUrlFromDeploy,
} from "./measure-plan.mjs";
import { startRangeFixture } from "./range-fixture-server.mjs";

const APP_DIR = fileURLToPath(new URL("..", import.meta.url));
const CONFIG_PATH = join(APP_DIR, "throwaway.wrangler.jsonc");
const CLOUDFLARED_URL =
  "https://github.com/cloudflare/cloudflared/releases/download/2026.10.1/cloudflared-linux-amd64";

function run(args, { input } = {}) {
  return spawnSync("pnpm", ["exec", ...args], {
    cwd: APP_DIR,
    encoding: "utf8",
    env: { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "true" },
    input,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function outputOf(result) {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
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
  return { path, sha256: hash.digest("hex"), bytes, async remove() { await rm(dir, { recursive: true, force: true }); } };
}

function writeConfig(includeR2) {
  const config = throwawayConfig({ includeR2, compatibilityDate: COMPATIBILITY_DATE });
  return writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

async function deploy(includeR2) {
  await writeConfig(includeR2);
  const deployed = run(["wrangler", "deploy", "--config", CONFIG_PATH]);
  if (deployed.status !== 0 && includeR2 && /service|binding/i.test(outputOf(deployed))) {
    const bare = throwawayConfig({ includeR2: false, compatibilityDate: COMPATIBILITY_DATE });
    bare.durable_objects = throwawayConfig({ includeR2: true }).durable_objects;
    bare.migrations = throwawayConfig({ includeR2: true }).migrations;
    bare.r2_buckets = throwawayConfig({ includeR2: true }).r2_buckets;
    await writeFile(CONFIG_PATH, JSON.stringify(bare, null, 2));
    const first = run(["wrangler", "deploy", "--config", CONFIG_PATH]);
    if (first.status !== 0) throw new Error(`wrangler deploy failed: ${outputOf(first)}`);
    await writeConfig(includeR2);
    const second = run(["wrangler", "deploy", "--config", CONFIG_PATH]);
    if (second.status !== 0) throw new Error(`wrangler deploy failed: ${outputOf(second)}`);
    return outputOf(second);
  }
  if (deployed.status !== 0) throw new Error(`wrangler deploy failed: ${outputOf(deployed)}`);
  return outputOf(deployed);
}

function putSpikeToken(token) {
  const result = run(["wrangler", "secret", "put", "SPIKE_TOKEN", "--config", CONFIG_PATH], {
    input: `${token}\n`,
  });
  if (result.status !== 0) throw new Error(`secret put failed: ${outputOf(result)}`);
}

async function queryLogs(accountId, token, workerName, from, to) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/observability/telemetry/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(telemetryQueryBody(workerName, from, to)),
    },
  );
  const body = await response.json();
  return { httpStatus: response.status, body };
}

async function collectLogs(accountId, token, workerName, from) {
  const logs = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const queried = await queryLogs(accountId, token, workerName, from - 60_000, Date.now());
    logs.push(queried);
    if (queried.httpStatus === 200 && collectCpuSamples(queried.body).length) break;
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
  const last = logs.at(-1);
  return { samples: collectCpuSamples(last?.body), httpStatus: last?.httpStatus ?? null, last };
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

async function purgePrefix(base, auth, prefix) {
  const suffix = prefix ? `?prefix=${encodeURIComponent(prefix)}` : "";
  let guard = 0;
  while (guard < 80) {
    guard += 1;
    const response = await fetch(`${base}/spike/purge-r2${suffix}`, { method: "POST", headers: auth });
    if (!response.ok) return;
    const body = await response.json();
    if (!body.deleted) return;
  }
}

async function downloadSha(base, auth, sessionId, session) {
  if (!session?.complete || !Array.isArray(session.parts)) return null;
  const hash = createHash("sha256");
  for (const part of session.parts) {
    const partResponse = await fetch(`${base}/sink/sessions/${sessionId}/parts/${part.start}`, { headers: auth });
    if (!partResponse.ok) throw new Error(`part ${part.start} download ${partResponse.status}`);
    hash.update(Buffer.from(await partResponse.arrayBuffer()));
  }
  return hash.digest("hex");
}

function cpuExceeded(instance) {
  const text = JSON.stringify(instance?.error ?? instance ?? "");
  return /cpu time limit|exceeded the CPU|Error 1102|exceededCpu/i.test(text);
}

async function runOneSize({ base, auth, totalSize, chunkBytes, source, storage, localSha, fixture }) {
  const body = {
    totalSize,
    chunkSize: chunkBytes,
    storage,
    source,
    sinkBaseUrl: source.sinkBaseUrl,
  };
  if (body.sinkBaseUrl) delete body.storage;
  const response = await fetch(`${base}/uploads`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`start failed ${response.status}: ${JSON.stringify(payload)}`);
  const startedAt = Date.now();
  const finished = await poll(base, auth, payload.instanceId);
  let checksumMatches = null;
  if (fixture) {
    const local = fixture.session(payload.sessionId);
    checksumMatches = localSha ? local?.sha256 === localSha : null;
    return {
      instance: finished,
      checksumMatches,
      complete: local?.received === totalSize && finished.status === "complete",
      received: local?.received ?? null,
      startedAt,
    };
  }
  const sessionResponse = await fetch(`${base}/sink/sessions/${payload.sessionId}`, { headers: auth });
  const session = await sessionResponse.json();
  if (session.complete) {
    const downloaded = await downloadSha(base, auth, payload.sessionId, session);
    checksumMatches = localSha ? downloaded === localSha : null;
  }
  return {
    instance: finished,
    checksumMatches,
    complete: Boolean(session.complete) && finished.status === "complete",
    received: session.received ?? null,
    startedAt,
    sessionId: payload.sessionId,
  };
}

async function ensureCloudflared() {
  const dest = join(tmpdir(), "cloudflared-2026.10.1");
  try {
    await readFile(dest);
    return dest;
  } catch {
    // download below
  }
  const response = await fetch(CLOUDFLARED_URL);
  if (!response.ok || !response.body) throw new Error(`cloudflared download failed: ${response.status}`);
  const stream = createWriteStream(dest);
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!stream.write(value)) await new Promise((resolve) => stream.once("drain", resolve));
  }
  await new Promise((resolve, reject) => stream.end((error) => (error ? reject(error) : resolve())));
  await chmod(dest, 0o755);
  return dest;
}

function startTunnel(port) {
  return ensureCloudflared().then(
    (bin) =>
      new Promise((resolve, reject) => {
        const child = spawn(bin, ["tunnel", "--url", `http://127.0.0.1:${port}`, "--no-autoupdate"], {
          stdio: ["ignore", "pipe", "pipe"],
        });
        let text = "";
        const timer = setTimeout(() => {
          child.kill("SIGTERM");
          reject(new Error(`cloudflared did not print a tunnel URL.\n${text}`));
        }, 45_000);
        const onData = (chunk) => {
          text += chunk.toString();
          const url = cloudflaredUrl(text);
          if (url) {
            clearTimeout(timer);
            resolve({
              url,
              stop() {
                child.kill("SIGTERM");
              },
            });
          }
        };
        child.stdout.on("data", onData);
        child.stderr.on("data", onData);
        child.on("exit", (code) => {
          clearTimeout(timer);
          reject(new Error(`cloudflared exited ${code} before a tunnel URL.\n${text}`));
        });
      }),
  );
}

async function deleteNamespaces(accountId, token) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/durable_objects/namespaces`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const body = await response.json();
  if (!response.ok) return `durable object list ${response.status}`;
  const namespaces = Array.isArray(body.result) ? body.result : [];
  const lines = [];
  for (const namespace of namespaces) {
    if (!namespaceIsThrowaway(namespace) || !namespace.id) continue;
    const deleted = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/durable_objects/namespaces/${namespace.id}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    lines.push(deleted.ok ? `deleted durable object namespace ${namespace.id}` : `durable object delete ${deleted.status}`);
  }
  if (!lines.length) lines.push("no throwaway durable object namespace was listed");
  return lines.join("; ");
}

export async function teardownThrowaway() {
  assertThrowawayName(THROWAWAY_WORKER_NAME);
  const lines = [];
  let failed = false;
  for (const args of teardownCommands()) {
    const result = run(args);
    const text = outputOf(result).trim().split("\n").at(-1) ?? "";
    if (result.status === 0) lines.push(`${args.join(" ")} ok`);
    else if (isIgnorableTeardown(outputOf(result))) lines.push(`${args[0]} ${args[1]} ${args[2] ?? ""} already gone`);
    else {
      failed = true;
      lines.push(`${args.join(" ")} failed: ${text}`);
    }
  }
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) {
    try {
      lines.push(await deleteNamespaces(process.env.CLOUDFLARE_ACCOUNT_ID, process.env.CLOUDFLARE_API_TOKEN));
    } catch (error) {
      lines.push(`durable object cleanup failed: ${error instanceof Error ? error.message : error}`);
    }
  }
  await rm(CONFIG_PATH, { force: true });
  return { lines, failed };
}

async function tryCreateBucket() {
  const created = run(["wrangler", "r2", "bucket", "create", THROWAWAY_WORKER_NAME]);
  const text = outputOf(created);
  if (created.status === 0 || /already exists/i.test(text)) return { ok: true, text };
  if (r2Unavailable(text)) return { ok: false, unavailable: true, text: text.trim().slice(0, 500) };
  throw new Error(`r2 bucket create failed: ${text}`);
}

export async function runSweep({ bytes, startChunkBytes, out, summaryPath }) {
  assertThrowawayName(THROWAWAY_WORKER_NAME);
  if (bytes > LONG_VIDEO_BYTES) throw new Error("bytes must be <= 500 MiB");
  const scheduled = planSweep(bytes, startChunkBytes);
  const report = {
    sourceMode: null,
    r2Detail: null,
    base: null,
    bytes,
    attempts: [],
    skipped: scheduled.skipped,
    teardown: [],
    teardownFailed: false,
    youTubeCalled: false,
  };
  const spikeToken = randomBytes(24).toString("hex");
  let fixture = null;
  let tunnel = null;
  let file = null;
  const auth = { Authorization: `Bearer ${spikeToken}`, "Content-Type": "application/json" };

  const finish = async () => {
    if (report.base && report.sourceMode === "r2") {
      try {
        await purgePrefix(report.base, auth, "");
      } catch {
        // Teardown still deletes the bucket. A non-empty bucket is reported below.
      }
    }
    if (tunnel) tunnel.stop();
    if (fixture) await fixture.close();
    if (file) await file.remove();
    const torn = await teardownThrowaway();
    report.teardown = torn.lines;
    report.teardownFailed = torn.failed;
    const markdown = renderSummary(report);
    console.log(markdown);
    if (summaryPath) {
      const { appendFile } = await import("node:fs/promises");
      await appendFile(summaryPath, `${markdown}\n`);
    }
    if (out) await writeFile(out, JSON.stringify(report, null, 2));
    return exitCodeFor(report);
  };

  try {
    await teardownThrowaway();
    const bucket = await tryCreateBucket();
    file = await writeMeasuredFile(bytes);
    let source;
    let storage = "r2";
    if (bucket.ok) {
      report.sourceMode = "r2";
      const deployed = await deploy(true);
      report.base = workerUrlFromDeploy(deployed);
      if (!report.base) throw new Error("deploy succeeded but the workers.dev URL was not in the output");
      putSpikeToken(spikeToken);
      const put = run([
        "wrangler",
        "r2",
        "object",
        "put",
        `${THROWAWAY_WORKER_NAME}/source.bin`,
        `--file=${file.path}`,
        "--remote",
      ]);
      if (put.status !== 0) throw new Error(`r2 object put failed: ${outputOf(put)}`);
      source = { kind: "r2", key: "source.bin" };
    } else {
      report.sourceMode = "runner";
      report.r2Detail = bucket.text;
      fixture = await startRangeFixture({ filePath: file.path, totalSize: bytes });
      tunnel = await startTunnel(fixture.port);
      const publicBase = `${tunnel.url}${fixture.basePath}`;
      assertSafeRemoteUrl(`${publicBase}/source`);
      const deployed = await deploy(false);
      report.base = workerUrlFromDeploy(deployed);
      if (!report.base) throw new Error("deploy succeeded but the workers.dev URL was not in the output");
      putSpikeToken(spikeToken);
      source = { kind: "http", url: `${publicBase}/source`, sinkBaseUrl: publicBase };
      storage = "memory";
    }

    let stop = false;
    for (const planned of scheduled.runs) {
      if (stop) break;
      const measured = await runOneSize({
        base: report.base,
        auth,
        totalSize: bytes,
        chunkBytes: planned.chunkBytes,
        source,
        storage,
        localSha: file.sha256,
        fixture,
      });
      const logs = await collectLogs(
        process.env.CLOUDFLARE_ACCOUNT_ID,
        process.env.CLOUDFLARE_API_TOKEN,
        THROWAWAY_WORKER_NAME,
        measured.startedAt,
      );
      const cpuTimeMs = logs.samples.map((sample) => sample.cpuTimeMs);
      const attempt = {
        chunkBytes: planned.chunkBytes,
        steps: planned.steps,
        complete: measured.complete,
        checksumMatches: measured.checksumMatches,
        cpuExceeded: cpuExceeded(measured.instance),
        cpuTimeMs,
        cpuTimeMsMax: cpuTimeMs.length ? Math.max(...cpuTimeMs) : null,
        logQueryHttpStatus: logs.httpStatus,
        received: measured.received,
      };
      attempt.decision = decideNext(attempt);
      report.attempts.push(attempt);
      report.lastLogQuery = logs.last;
      if (attempt.decision !== "step-down") stop = true;
      else if (report.sourceMode === "r2" && measured.sessionId) await purgePrefix(report.base, auth, "sessions/");
    }
  } catch (error) {
    report.infrastructureError = error instanceof Error ? error.message : String(error);
    console.error(report.infrastructureError);
  }
  return finish();
}
