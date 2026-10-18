/**
 * Pure planning for the Workers Free CPU sweep. No network and no invented CPU numbers.
 */

export const THROWAWAY_WORKER_NAME = "yt-spike-gha-throwaway";
export const LONG_VIDEO_BYTES = 500 * 1024 * 1024;
export const CPU_LIMIT_MS = 10;
/** Stay under the 3,000 steps/day cap, leaving room for a retried step. */
export const SWEEP_STEP_BUDGET = 2_800;
/**
 * Chunk steps per Workflow instance. Matches maxChunkStepsPerInstance() in
 * src/budget.ts: 1 status subrequest + 3 per chunk, under the Free cap of 50.
 * The 1,020 step instance budget is looser than this on the measured runtime.
 */
export const CHUNK_STEPS_PER_INSTANCE = 16;
export const COMPATIBILITY_DATE = "2026-08-22";
export const EXPECTED_WORKERS_DEV_SUFFIX = ".coderdevelopment.workers.dev";

export const CHUNK_CANDIDATES_BYTES = [
  64 * 1024 * 1024,
  32 * 1024 * 1024,
  16 * 1024 * 1024,
  8 * 1024 * 1024,
  4 * 1024 * 1024,
  2 * 1024 * 1024,
  1 * 1024 * 1024,
  512 * 1024,
  256 * 1024,
];

const YOUTUBE_HOST =
  /(^|\.)youtube\.com$|(^|\.)youtu\.be$|(^|\.)googlevideo\.com$|(^|\.)youtube-nocookie\.com$/;

export function assertThrowawayName(name) {
  if (name !== THROWAWAY_WORKER_NAME) {
    throw new Error(`refusing to deploy or delete a worker named ${name}`);
  }
}

export function stepsForRun(totalBytes, chunkBytes) {
  if (chunkBytes < 1) throw new Error("chunkBytes must be positive");
  const chunkSteps = Math.ceil(totalBytes / chunkBytes);
  const instances = Math.max(1, Math.ceil(chunkSteps / CHUNK_STEPS_PER_INSTANCE));
  return chunkSteps + instances;
}

/**
 * Incomplete transfers have no digest. Comparing a null hash to the file
 * hash is not a checksum mismatch.
 */
export function checksumMatches({ complete, actualSha, expectedSha }) {
  if (!complete) return null;
  if (typeof actualSha !== "string" || typeof expectedSha !== "string") return null;
  return actualSha === expectedSha;
}

/** Start another instance on the same sink session. */
export function shouldResumeInstance(finished) {
  if (!finished || finished.status === "terminated") return false;
  const reason = finished.output?.reason;
  if (reason === "subrequest-budget" || reason === "instance-step-budget") return true;
  if (finished.status !== "errored") return false;
  const text = JSON.stringify(finished.error ?? "");
  return /subrequest limit|too many subrequests|exceeded .*subrequests/i.test(text);
}

export function planSweep(totalBytes, startChunkBytes) {
  if (!CHUNK_CANDIDATES_BYTES.includes(startChunkBytes)) {
    throw new Error("start chunk must be one of 64/32/16/8/4/2/1 MiB or 512/256 KiB");
  }
  const runs = [];
  const skipped = [];
  let used = 0;
  let overBudget = false;
  for (const chunkBytes of CHUNK_CANDIDATES_BYTES) {
    if (chunkBytes > startChunkBytes) continue;
    const steps = stepsForRun(totalBytes, chunkBytes);
    if (overBudget || used + steps > SWEEP_STEP_BUDGET) {
      overBudget = true;
      skipped.push({ chunkBytes, steps, reason: "daily Workflow step cap" });
      continue;
    }
    runs.push({ chunkBytes, steps });
    used += steps;
  }
  return { runs, skipped, stepsBudget: SWEEP_STEP_BUDGET, stepsIfEveryScheduledRunExecutes: used };
}

/**
 * @param {{ complete?: boolean, checksumMatches?: boolean | null, cpuTimeMsMax?: number | null, cpuExceeded?: boolean }} attempt
 */
export function decideNext(attempt) {
  if (attempt.cpuExceeded) return "step-down";
  if (!attempt.complete) return "stop-error";
  if (attempt.checksumMatches === false) return "stop-error";
  if (attempt.cpuTimeMsMax == null) return "stop-no-cpu";
  if (attempt.cpuTimeMsMax < CPU_LIMIT_MS) return "stop-pass";
  return "step-down";
}

export function r2Unavailable(text) {
  return /enable R2|not subscribed to R2|r2 subscription|add a payment method|payment method|purchase R2|must subscribe/i.test(
    text,
  );
}

export function isIgnorableTeardown(text) {
  const plain = String(text ?? "")
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/\s+/g, " ");
  return /not found|does not exist|already deleted|already been deleted|10007|10042|10090|10200|no such|\b404\b|code: 7003|not exist/i.test(
    plain,
  );
}

/**
 * Cloudflare's workflow-not-found error is code 10200. Worker-not-found is 10007.
 * A missing resource is a successful teardown.
 */
export function cloudflareErrorIsMissing(status, body) {
  if (status === 404) return true;
  const errors = Array.isArray(body?.errors) ? body.errors : [];
  return errors.some((error) => {
    const code = Number(error?.code);
    if (code === 10007 || code === 10200 || code === 10090) return true;
    return isIgnorableTeardown(String(error?.message ?? ""));
  });
}

export function assertSafeRemoteUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("remote URL is not valid");
  }
  if (url.protocol !== "https:") throw new Error("remote URL must be https");
  if (YOUTUBE_HOST.test(url.hostname.toLowerCase())) throw new Error("refusing to contact YouTube");
}

export function workerUrlFromDeploy(output, workerName = THROWAWAY_WORKER_NAME) {
  const escaped = workerName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = output.match(new RegExp(`https://${escaped}\\.[a-z0-9-]+\\.workers\\.dev`));
  return match ? match[0] : null;
}

export function cloudflaredUrl(output) {
  const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  return match ? match[0] : null;
}

export function namespaceIsThrowaway(namespace) {
  if (!namespace || typeof namespace !== "object") return false;
  if (namespace.script === THROWAWAY_WORKER_NAME) return true;
  return namespace.name === `${THROWAWAY_WORKER_NAME}-UploadSession`;
}

export function throwawayConfig({ includeR2, compatibilityDate = COMPATIBILITY_DATE }) {
  assertThrowawayName(THROWAWAY_WORKER_NAME);
  const config = {
    name: THROWAWAY_WORKER_NAME,
    main: "src/index.ts",
    compatibility_date: compatibilityDate,
    workers_dev: true,
    // head_sampling_rate 1 is 100% (Workers Logs docs). logs.invocation_logs
    // keeps the invocation event that carries $workers.cpuTimeMs.
    observability: {
      enabled: true,
      head_sampling_rate: 1,
      logs: { enabled: true, head_sampling_rate: 1, invocation_logs: true },
    },
    vars: { SPIKE: "yt-upload-spike", PLAN: "workers-free" },
    workflows: [
      {
        name: THROWAWAY_WORKER_NAME,
        binding: "UPLOAD_WORKFLOW",
        class_name: "UploadWorkflow",
      },
    ],
  };
  if (includeR2) {
    config.durable_objects = {
      bindings: [{ name: "SESSIONS", class_name: "UploadSession" }],
    };
    config.migrations = [{ tag: "v1", new_sqlite_classes: ["UploadSession"] }];
    config.r2_buckets = [{ binding: "BUCKET", bucket_name: THROWAWAY_WORKER_NAME }];
    config.services = [{ binding: "API", service: THROWAWAY_WORKER_NAME }];
  }
  return config;
}

export function teardownCommands() {
  assertThrowawayName(THROWAWAY_WORKER_NAME);
  return [
    ["wrangler", "workflows", "delete", THROWAWAY_WORKER_NAME],
    ["wrangler", "delete", THROWAWAY_WORKER_NAME, "--force"],
    ["wrangler", "r2", "object", "delete", `${THROWAWAY_WORKER_NAME}/source.bin`],
    ["wrangler", "r2", "bucket", "delete", THROWAWAY_WORKER_NAME],
  ];
}

export function telemetryQueryBody(workerName, from, to, view = "invocations") {
  return {
    queryId: `yt-spike-${workerName}-${view}-${from}`,
    dry: true,
    view,
    limit: 1000,
    timeframe: { from, to },
    parameters: {
      filterCombination: "and",
      filters: [
        {
          key: "$workers.scriptName",
          operation: "eq",
          type: "string",
          value: workerName,
        },
      ],
    },
  };
}

/**
 * Used only when the scriptName query returns nothing, to see whether the
 * uploader log was stored under a different script name.
 */
export function telemetryDiscoveryQueryBody(from, to) {
  return {
    queryId: `yt-spike-discover-${from}`,
    dry: true,
    view: "events",
    limit: 100,
    timeframe: { from, to },
    parameters: {
      filterCombination: "and",
      filters: [],
      needle: { value: "uploader", isRegex: false, matchCase: false },
    },
  };
}

function eventText(node) {
  const parts = [];
  if (typeof node.source === "string") parts.push(node.source);
  if (typeof node.$metadata?.message === "string") parts.push(node.$metadata.message);
  if (typeof node.message === "string") parts.push(node.message);
  if (Array.isArray(node.logs)) {
    for (const log of node.logs) {
      const message = log?.message;
      if (typeof message === "string") parts.push(message);
      else if (Array.isArray(message)) {
        parts.push(message.map((part) => (typeof part === "string" ? part : JSON.stringify(part))).join(" "));
      } else if (message && typeof message === "object") parts.push(JSON.stringify(message));
    }
  }
  return parts.join("\n");
}

function isUploaderChunk(text) {
  return text.includes('"role":"uploader"') && text.includes('"event":"chunk"');
}

function chunkOffsets(text) {
  const offsets = new Set();
  const patterns = [
    /"role":"uploader","event":"chunk","offset":(\d+)/g,
    /\\"role\\":\\"uploader\\",\\"event\\":\\"chunk\\",\\"offset\\":(\d+)/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) offsets.add(match[1]);
  }
  return offsets;
}

function offsetsFor(event) {
  const offsets = new Set();
  const seen = new Set();
  const walk = (value) => {
    if (!value || typeof value !== "object") return;
    if (seen.has(value)) return;
    seen.add(value);
    if (
      !Array.isArray(value) &&
      value.role === "uploader" &&
      value.event === "chunk" &&
      (typeof value.offset === "number" || typeof value.offset === "string")
    ) {
      offsets.add(String(value.offset));
    }
    for (const child of Object.values(value)) walk(child);
  };
  walk(event);
  const text = `${eventText(event)}\n${JSON.stringify(event)}`;
  for (const offset of chunkOffsets(text)) offsets.add(offset);
  return { offsets, text };
}

function chunkCountFrom(event) {
  const { offsets, text } = offsetsFor(event);
  if (offsets.size > 0) return offsets.size;
  return isUploaderChunk(text) ? 1 : 0;
}

function invocationKind(event) {
  const type = event?.$workers?.eventType;
  if (typeof type === "string" && type) return type;
  if (event?.message === "workflow" || event?.$metadata?.message === "workflow") return "workflow";
  return "other";
}

function eventId(event, fallback) {
  const id = event?.$metadata?.id ?? event?.$workers?.requestId ?? event?.eventTimestamp;
  return String(id ?? fallback);
}

function cpuMillis(event) {
  const values = [event?.$workers?.cpuTimeMs, event?.cpuTimeMs, event?.CPUTimeMs];
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function isEventLike(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && (value.$workers || value.$metadata || value.source || value.logs));
}

function gatherGroups(value, groups) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) gatherGroups(item, groups);
    return;
  }
  if (value.invocations && typeof value.invocations === "object" && !Array.isArray(value.invocations)) {
    for (const group of Object.values(value.invocations)) {
      if (Array.isArray(group)) groups.push(group.filter(isEventLike));
    }
  }
  const eventsAreLogs = Array.isArray(value.events) && value.events.some(isEventLike);
  if (eventsAreLogs) {
    for (const event of value.events) {
      if (isEventLike(event)) groups.push([event]);
    }
  }
  for (const [key, child] of Object.entries(value)) {
    if (key === "invocations") continue;
    if (key === "events" && eventsAreLogs) continue;
    if (child && typeof child === "object") gatherGroups(child, groups);
  }
}

function remember(list, seen, item) {
  if (seen.has(item.id)) return;
  seen.add(item.id);
  list.push(item);
}

/**
 * A chunk sample is one event that describes exactly one uploader chunk and
 * itself carries cpuTimeMs or CPUTimeMs. A sibling outcome on the same
 * request id is a different invocation. A workflow-instance CPU time is not
 * divided across chunks and is not used as a chunk sample.
 */
export function classifyCpu(value) {
  const groups = [];
  gatherGroups(value, groups);
  const chunkSamples = [];
  const otherInvocations = [];
  const seenChunks = new Set();
  const seenOther = new Set();
  let chunkLogsWithoutCpu = 0;
  let fallback = 0;
  for (const group of groups) {
    for (const event of group) {
      const chunks = chunkCountFrom(event);
      const cpu = cpuMillis(event);
      const id = eventId(event, `event-${fallback}`);
      fallback += 1;
      if (chunks === 1 && cpu != null) {
        remember(chunkSamples, seenChunks, { id, cpuTimeMs: cpu });
        continue;
      }
      if (chunks >= 1) {
        chunkLogsWithoutCpu += chunks;
        if (cpu != null) {
          remember(otherInvocations, seenOther, {
            id,
            kind: invocationKind(event),
            cpuTimeMs: cpu,
          });
        }
        continue;
      }
      const kind = invocationKind(event);
      if (cpu == null && kind !== "workflow" && kind !== "fetch") continue;
      remember(otherInvocations, seenOther, { id, kind, cpuTimeMs: cpu });
    }
  }
  return { chunkSamples, otherInvocations, chunkLogsWithoutCpu };
}

/** Per-chunk samples only. Workflow and fetch CPU stays out of this list. */
export function collectCpuSamples(value) {
  return classifyCpu(value).chunkSamples;
}

export function formatOtherInvocations(list) {
  if (!list?.length) return "";
  const byKind = new Map();
  for (const item of list) {
    const kind = item.kind || "other";
    if (!byKind.has(kind)) byKind.set(kind, []);
    byKind.get(kind).push(item.cpuTimeMs);
  }
  const parts = [];
  for (const [kind, cpus] of byKind) {
    const present = cpus.filter((cpu) => typeof cpu === "number");
    const missing = cpus.length - present.length;
    const unique = [...new Set(present)].sort((left, right) => left - right);
    let cpuText = present.length ? `cpuTimeMs ${unique.join(", ")}` : "cpuTimeMs not returned";
    if (present.length && missing) cpuText += `; ${missing} without cpuTimeMs`;
    parts.push(`${cpus.length} ${kind} (${cpuText})`);
  }
  return `Non-chunk invocations (not used for step-down): ${parts.join("; ")}.`;
}

export function summarizeTelemetry(body) {
  const scriptNames = new Set();
  let events = 0;
  let invocations = 0;
  const walk = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (typeof value.$workers?.scriptName === "string") scriptNames.add(value.$workers.scriptName);
    if (Array.isArray(value.events)) events += value.events.filter(isEventLike).length;
    if (value.invocations && typeof value.invocations === "object" && !Array.isArray(value.invocations)) {
      invocations += Object.keys(value.invocations).length;
    }
    for (const child of Object.values(value)) walk(child);
  };
  walk(body);
  return { events, invocations, scriptNames: [...scriptNames] };
}

/**
 * Tail `--format json` pretty-prints one object per event. Pull complete
 * objects out of a stdout buffer and keep the unfinished tail.
 */
export function extractJsonObjects(buffer) {
  const objects = [];
  let rest = buffer;
  let start = rest.indexOf("{");
  while (start !== -1) {
    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;
    for (let index = start; index < rest.length; index += 1) {
      const char = rest[index];
      if (inString) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') inString = false;
        continue;
      }
      if (char === '"') inString = true;
      else if (char === "{") depth += 1;
      else if (char === "}") {
        depth -= 1;
        if (depth === 0) {
          end = index;
          break;
        }
      }
    }
    if (end === -1) break;
    try {
      objects.push(JSON.parse(rest.slice(start, end + 1)));
    } catch {
      // A brace inside a banner is not an event.
    }
    rest = rest.slice(end + 1);
    start = rest.indexOf("{");
  }
  const unfinished = rest.lastIndexOf("{");
  return { objects, rest: unfinished === -1 ? "" : rest.slice(unfinished) };
}

/**
 * Scores a tail event only when that event is exactly one uploader chunk and
 * has cpuTimeMs or CPUTimeMs. An event that contains several chunk logs and
 * one CPU figure is the instance summary, not one chunk sample. Trace
 * `cpuTime` is left unscored: workers-types do not document its unit, and
 * GraphQL cpuTimeP50 is microseconds.
 */
export function collectTailCpuSamples(events) {
  const samples = [];
  const otherInvocations = [];
  let uploaderLogs = 0;
  let chunkLogsWithoutCpu = 0;
  let unscoredCpuTime = 0;
  for (const event of events) {
    if (!event || typeof event !== "object") continue;
    const chunks = chunkCountFrom(event);
    const cpu = cpuMillis(event);
    const id = eventId(event, samples.length + otherInvocations.length);
    if (chunks === 1) {
      uploaderLogs += 1;
      if (cpu != null) {
        if (!samples.some((item) => item.id === id)) samples.push({ id, cpuTimeMs: cpu });
        continue;
      }
      chunkLogsWithoutCpu += 1;
      if (typeof event.cpuTime === "number") unscoredCpuTime += 1;
      continue;
    }
    if (chunks > 1) {
      uploaderLogs += chunks;
      chunkLogsWithoutCpu += chunks;
      if (cpu != null) otherInvocations.push({ id, kind: invocationKind(event), cpuTimeMs: cpu });
      else if (typeof event.cpuTime === "number") unscoredCpuTime += 1;
      continue;
    }
    if (cpu != null) otherInvocations.push({ id, kind: invocationKind(event), cpuTimeMs: cpu });
  }
  return { samples, otherInvocations, uploaderLogs, chunkLogsWithoutCpu, unscoredCpuTime };
}

export function explainMissingCpu({
  httpStatus,
  polls,
  summary,
  tailConnected,
  tailEvents,
  tailUploaderLogs,
  tailUnscoredCpuTime,
  chunkLogsWithoutCpu = 0,
}) {
  const where = summary.scriptNames.length ? ` scriptName ${summary.scriptNames.join(", ")}` : "";
  const parts = [
    `Workers Logs query HTTP ${httpStatus ?? "n/a"} after ${polls} polls: ${summary.events} events, ${summary.invocations} invocations${where}.`,
  ];
  if (!tailConnected) parts.push("wrangler tail did not connect.");
  else parts.push(`wrangler tail connected: ${tailEvents} events, ${tailUploaderLogs} with an uploader chunk log.`);
  if (chunkLogsWithoutCpu > 0) {
    parts.push(`${chunkLogsWithoutCpu} uploader chunk logs had no cpuTimeMs on that event.`);
  }
  if (tailUnscoredCpuTime > 0) {
    parts.push(
      `${tailUnscoredCpuTime} of those tail events included cpuTime. That field was not scored. Workers Logs publishes cpuTimeMs, and GraphQL cpuTimeP50 is a different unit.`,
    );
  }
  parts.push("No per-chunk cpuTimeMs sample was returned. No CPU figure was filled in.");
  return parts.join(" ");
}

export function formatBytes(bytes) {
  if (bytes % (1024 * 1024) === 0) return `${bytes / (1024 * 1024)} MiB`;
  if (bytes % 1024 === 0) return `${bytes / 1024} KiB`;
  return `${bytes} bytes`;
}

export function renderSummary(report) {
  const lines = [
    "# Y0 Workers Free CPU measure",
    "",
    `Worker: \`${THROWAWAY_WORKER_NAME}\` on workers.dev. YouTube was not called.`,
    "",
  ];
  if (report.sourceMode === "r2") {
    lines.push("Source: R2 stand-in (the fixture was uploaded to the throwaway bucket). No Drive grant.");
  } else if (report.sourceMode === "runner") {
    lines.push(
      "Source: Actions-runner fixture, because R2 could not be created without billing. Cloudflare still asks for a payment method before the R2 free tier (10 GB-month) will create a bucket. The runner served the file and the mock sink over a temporary tunnel. The Worker only streamed Range GETs into sink PUTs.",
    );
    if (report.r2Detail) lines.push("", `R2 response: ${report.r2Detail}`);
  } else {
    lines.push("Source: not started.");
  }
  if (report.base && !report.base.endsWith(EXPECTED_WORKERS_DEV_SUFFIX)) {
    lines.push(
      "",
      `The workers.dev host was \`${report.base}\`. This account's expected suffix is \`${EXPECTED_WORKERS_DEV_SUFFIX}\`. Confirm CLOUDFLARE_ACCOUNT_ID is the Free account.`,
    );
  }
  lines.push("", "| Chunk | Scheduled steps | Complete | Checksum | cpuTimeMs max | Samples | Decision |", "|---|---:|---|---|---:|---:|---|");
  for (const attempt of report.attempts ?? []) {
    const cpu = attempt.cpuTimeMsMax == null ? "not returned" : String(attempt.cpuTimeMsMax);
    const checksum =
      attempt.checksumMatches == null ? "n/a" : attempt.checksumMatches ? "match" : "mismatch";
    lines.push(
      `| ${formatBytes(attempt.chunkBytes)} | ${attempt.steps} | ${attempt.complete ? "yes" : "no"} | ${checksum} | ${cpu} | ${(attempt.cpuTimeMs ?? []).length} | ${attempt.decision ?? ""} |`,
    );
  }
  if (!(report.attempts ?? []).length) lines.push("| — | — | — | — | not returned | 0 | not run |");
  if ((report.skipped ?? []).length) {
    lines.push("", "Not scheduled, because running them in the same UTC day would pass 3,000 Workflow steps:");
    for (const skipped of report.skipped) {
      lines.push(`- ${formatBytes(skipped.chunkBytes)} would add ${skipped.steps} steps (${skipped.reason}).`);
    }
  }
  lines.push(
    "",
    "The cpuTimeMs max column is the maximum on uploader chunk events that themselves included cpuTimeMs (or Logpush CPUTimeMs). One sample is one chunk. A workflow-instance outcome or a fetch invocation is listed separately and is not that max. Empty cells were not filled in.",
  );
  for (const attempt of report.attempts ?? []) {
    if (attempt.chunkLogsWithoutCpu > 0) {
      lines.push(
        "",
        `${formatBytes(attempt.chunkBytes)}: ${attempt.chunkLogsWithoutCpu} uploader chunk logs had no cpuTimeMs on that event.`,
      );
    }
    const other = formatOtherInvocations(attempt.otherInvocations);
    if (other) lines.push("", other);
    if (attempt.logNote) lines.push("", attempt.logNote);
  }
  lines.push("", "Teardown:");
  for (const line of report.teardown ?? []) lines.push(`- ${line}`);
  if (!(report.teardown ?? []).length) lines.push("- not recorded");
  if (report.infrastructureError) {
    lines.push("", `Stopped on an infrastructure error: ${report.infrastructureError}`);
  }
  return lines.join("\n");
}

export function exitCodeFor(report) {
  if (report.infrastructureError) return 1;
  if (report.teardownFailed) return 1;
  const decisions = (report.attempts ?? []).map((attempt) => attempt.decision);
  if (decisions.includes("stop-error")) return 1;
  if (decisions.includes("stop-pass")) return 0;
  if (decisions.includes("step-down") && (report.attempts ?? []).some((attempt) => attempt.cpuTimeMsMax != null)) {
    return 0;
  }
  if (decisions.includes("stop-no-cpu")) return 3;
  if ((report.attempts ?? []).some((attempt) => attempt.complete)) return 3;
  return 1;
}
