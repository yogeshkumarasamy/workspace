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
  cloudflareErrorIsMissing,
  checksumMatches,
  classifyCpu,
  collectTailCpuSamples,
  COMPATIBILITY_DATE,
  decideNext,
  exitCodeFor,
  explainMissingCpu,
  extractJsonObjects,
  isIgnorableTeardown,
  LONG_VIDEO_BYTES,
  namespaceIsThrowaway,
  planSweep,
  r2Unavailable,
  renderSummary,
  shouldResumeInstance,
  summarizeTelemetry,
  teardownCommands,
  telemetryDiscoveryQueryBody,
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

function failureDetail(result) {
  const plain = outputOf(result)
    .replace(/\u001b\[[0-9;]*m/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-8)
    .join(" | ");
  return plain.slice(0, 500);
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

async function queryLogs(accountId, token, body) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/observability/telemetry/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const parsed = await response.json();
  return { httpStatus: response.status, body: parsed };
}

const LOG_POLLS = 12;
const LOG_POLL_MS = 10_000;

function classificationFromTail(tailed) {
  return {
    chunkSamples: tailed.samples,
    otherInvocations: tailed.otherInvocations,
    chunkLogsWithoutCpu: tailed.chunkLogsWithoutCpu,
  };
}

async function collectLogs(accountId, token, workerName, from, tail) {
  const logs = [];
  let classified = { chunkSamples: [], otherInvocations: [], chunkLogsWithoutCpu: 0 };
  let source = "";
  for (let attempt = 0; attempt < LOG_POLLS; attempt += 1) {
    const to = Date.now();
    let queried = await queryLogs(accountId, token, telemetryQueryBody(workerName, from - 60_000, to, "invocations"));
    if (queried.httpStatus >= 400) {
      queried = await queryLogs(accountId, token, telemetryQueryBody(workerName, from - 60_000, to, "events"));
    }
    logs.push(queried);
    classified = classifyCpu(queried.body);
    if (queried.httpStatus === 200 && classified.chunkSamples.length) {
      source = "Workers Logs $workers.cpuTimeMs on the uploader chunk event";
      break;
    }
    const tailed = collectTailCpuSamples(tail?.events ?? []);
    if (tailed.samples.length) {
      classified = classificationFromTail(tailed);
      source = "wrangler tail cpuTimeMs/CPUTimeMs on the same uploader chunk event";
      break;
    }
    if (attempt < LOG_POLLS - 1) await new Promise((resolve) => setTimeout(resolve, LOG_POLL_MS));
  }
  const last = logs.at(-1);
  const seen = summarizeTelemetry(last?.body);
  if (!classified.chunkSamples.length && last?.httpStatus === 200 && seen.events + seen.invocations === 0) {
    const discovered = await queryLogs(accountId, token, telemetryDiscoveryQueryBody(from - 60_000, Date.now()));
    logs.push(discovered);
    const found = classifyCpu(discovered.body);
    if (found.chunkSamples.length) {
      classified = found;
      source = "Workers Logs $workers.cpuTimeMs on the uploader chunk event (uploader needle, no scriptName filter)";
    }
  }
  if (!classified.chunkSamples.length) {
    const tailed = collectTailCpuSamples(tail?.events ?? []);
    if (tailed.samples.length) {
      classified = classificationFromTail(tailed);
      source = "wrangler tail cpuTimeMs/CPUTimeMs on the same uploader chunk event";
    }
  }
  const tailReport = collectTailCpuSamples(tail?.events ?? []);
  const summary = summarizeTelemetry(logs.at(-1)?.body);
  const logNote = classified.chunkSamples.length
    ? `Per-chunk cpuTimeMs source: ${source}. ${classified.chunkSamples.length} chunk sample(s). Last Workers Logs query had ${summary.events} events and ${summary.invocations} invocations.`
    : explainMissingCpu({
        httpStatus: logs.at(-1)?.httpStatus ?? null,
        polls: logs.length,
        summary,
        tailConnected: Boolean(tail?.connected),
        tailEvents: tail?.events.length ?? 0,
        tailUploaderLogs: tailReport.uploaderLogs,
        tailUnscoredCpuTime: tailReport.unscoredCpuTime,
        chunkLogsWithoutCpu: Math.max(classified.chunkLogsWithoutCpu, tailReport.chunkLogsWithoutCpu),
      });
  return {
    samples: classified.chunkSamples,
    otherInvocations: classified.otherInvocations,
    chunkLogsWithoutCpu: classified.chunkLogsWithoutCpu,
    httpStatus: logs.at(-1)?.httpStatus ?? null,
    last: logs.at(-1) ?? null,
    logNote,
  };
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
  const startedAt = Date.now();
  let sessionId = null;
  const instances = [];
  for (let guard = 0; guard < 200; guard += 1) {
    const body = {
      totalSize,
      chunkSize: chunkBytes,
      storage,
      source,
      sinkBaseUrl: source.sinkBaseUrl,
      ...(sessionId ? { sessionId } : {}),
    };
    if (body.sinkBaseUrl) delete body.storage;
    const response = await fetch(`${base}/uploads`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(`start failed ${response.status}: ${JSON.stringify(payload)}`);
    sessionId = payload.sessionId;
    const finished = await poll(base, auth, payload.instanceId);
    instances.push(finished);
    if (!shouldResumeInstance(finished)) break;
  }
  const last = instances.at(-1) ?? null;
  const workflowComplete = last?.status === "complete" && last?.output?.complete === true;
  if (fixture) {
    const local = fixture.session(sessionId);
    const sinkComplete = local?.received === totalSize && local?.complete === true;
    return {
      instance: last,
      instances,
      checksumMatches: checksumMatches({
        complete: sinkComplete,
        actualSha: local?.sha256 ?? null,
        expectedSha: localSha,
      }),
      complete: sinkComplete && workflowComplete,
      received: local?.received ?? null,
      startedAt,
      sessionId,
    };
  }
  const sessionResponse = await fetch(`${base}/sink/sessions/${sessionId}`, { headers: auth });
  const session = await sessionResponse.json();
  let actualSha = null;
  if (session.complete) actualSha = await downloadSha(base, auth, sessionId, session);
  const sinkComplete = Boolean(session.complete);
  return {
    instance: last,
    instances,
    checksumMatches: checksumMatches({ complete: sinkComplete, actualSha, expectedSha: localSha }),
    complete: sinkComplete && workflowComplete,
    received: session.received ?? null,
    startedAt,
    sessionId,
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

function startTail() {
  const child = spawn(
    "pnpm",
    ["exec", "wrangler", "tail", THROWAWAY_WORKER_NAME, "--format", "json", "--config", CONFIG_PATH],
    {
      cwd: APP_DIR,
      detached: true,
      env: { ...process.env, WRANGLER_SEND_METRICS: "false", CI: "true" },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const events = [];
  let buffer = "";
  let connected = false;
  const consume = (chunk) => {
    const text = chunk.toString();
    if (text.includes("waiting for logs")) connected = true;
    buffer += text;
    const extracted = extractJsonObjects(buffer);
    buffer = extracted.rest;
    events.push(...extracted.objects);
  };
  child.stdout?.on("data", consume);
  child.stderr?.on("data", consume);
  const ready = new Promise((resolve) => {
    const timer = setTimeout(() => resolve(connected), 20_000);
    const watch = () => {
      if (!connected) return;
      clearTimeout(timer);
      resolve(true);
    };
    child.stdout?.on("data", watch);
    child.stderr?.on("data", watch);
    child.on("exit", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
  return {
    events,
    ready,
    get connected() {
      return connected;
    },
    stop() {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
    },
  };
}

async function workflowAlreadyGone() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!accountId || !token) return null;
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/workflows/${THROWAWAY_WORKER_NAME}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = await response.json().catch(() => ({}));
    if (cloudflareErrorIsMissing(response.status, body)) return true;
    if (response.ok && body.success !== false && body.result) return false;
    return null;
  } catch {
    return null;
  }
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
    const isWorkflowDelete = args[1] === "workflows" && args[2] === "delete";
    if (isWorkflowDelete && (await workflowAlreadyGone()) === true) {
      lines.push(`${args.join(" ")} already gone`);
      continue;
    }
    const result = run(args);
    if (result.status === 0) {
      lines.push(`${args.join(" ")} ok`);
      continue;
    }
    if (isIgnorableTeardown(outputOf(result)) || (isWorkflowDelete && (await workflowAlreadyGone()) === true)) {
      lines.push(`${args[0]} ${args[1]} ${args[2] ?? ""} already gone`);
      continue;
    }
    failed = true;
    lines.push(`${args.join(" ")} failed: ${failureDetail(result)}`);
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
  let tail = null;
  const auth = { Authorization: `Bearer ${spikeToken}`, "Content-Type": "application/json" };

  const finish = async () => {
    if (report.base && report.sourceMode === "r2") {
      try {
        await purgePrefix(report.base, auth, "");
      } catch {
        // Teardown still deletes the bucket. A non-empty bucket is reported below.
      }
    }
    if (tail) tail.stop();
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
    tail = startTail();
    await tail.ready;

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
        tail,
      );
      const cpuTimeMs = logs.samples.map((sample) => sample.cpuTimeMs);
      const attempt = {
        chunkBytes: planned.chunkBytes,
        steps: planned.steps,
        complete: measured.complete,
        checksumMatches: measured.checksumMatches,
        cpuExceeded: (measured.instances ?? [measured.instance]).some((instance) => cpuExceeded(instance)),
        cpuTimeMs,
        cpuTimeMsMax: cpuTimeMs.length ? Math.max(...cpuTimeMs) : null,
        otherInvocations: logs.otherInvocations,
        chunkLogsWithoutCpu: logs.chunkLogsWithoutCpu,
        logQueryHttpStatus: logs.httpStatus,
        logNote: logs.logNote,
        received: measured.received,
        instances: measured.instances?.length ?? 1,
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
