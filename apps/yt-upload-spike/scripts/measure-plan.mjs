/**
 * Pure planning for the Workers Free CPU sweep. No network and no invented CPU numbers.
 */

export const THROWAWAY_WORKER_NAME = "yt-spike-gha-throwaway";
export const LONG_VIDEO_BYTES = 500 * 1024 * 1024;
export const CPU_LIMIT_MS = 10;
/** Stay under the 3,000 steps/day cap, leaving room for a retried step. */
export const SWEEP_STEP_BUDGET = 2_800;
/** Chunk steps per instance after the one status step inside the 1,020 step budget. */
export const INSTANCE_CHUNK_ROOM = 1_019;
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
  const instances = Math.max(1, Math.ceil(chunkSteps / INSTANCE_CHUNK_ROOM));
  return chunkSteps + instances;
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

function linkedSample(group) {
  const blobs = group.map((event) => `${eventText(event)}\n${JSON.stringify(event)}`);
  if (!isUploaderChunk(blobs.join("\n"))) return null;
  const ranked = [];
  for (let index = 0; index < group.length; index += 1) {
    const cpu = cpuMillis(group[index]);
    if (cpu == null) continue;
    const own = isUploaderChunk(blobs[index]);
    const workflow = group[index].$workers?.eventType === "workflow";
    ranked.push({
      rank: own ? 0 : workflow ? 1 : 2,
      id: group[index].$metadata?.id ?? group[index].$workers?.requestId ?? `uploader-${index}`,
      cpuTimeMs: cpu,
    });
  }
  ranked.sort((left, right) => left.rank - right.rank);
  if (!ranked.length) return null;
  return { id: ranked[0].id, cpuTimeMs: ranked[0].cpuTimeMs };
}

function workflowSamples(group) {
  const samples = [];
  for (const event of group) {
    const cpu = cpuMillis(event);
    if (cpu == null || event.$workers?.eventType !== "workflow") continue;
    const id = event.$metadata?.id ?? event.$workers?.requestId;
    if (id) samples.push({ id, cpuTimeMs: cpu });
  }
  return samples;
}

/**
 * Reads Workers Logs `cpuTimeMs` (or Logpush `CPUTimeMs`).
 * The invocation that carries cpuTimeMs is often a sibling of the console.log
 * inside the same request id, so an invocations group is joined.
 * When the console line was not stored, eventType "workflow" on this script is
 * still that field. GraphQL quantiles and tail `cpuTime` are not converted.
 */
export function collectCpuSamples(value, { workflowFallback = true } = {}) {
  const groups = [];
  gatherGroups(value, groups);
  const linked = [];
  const workflow = [];
  for (const group of groups) {
    const sample = linkedSample(group);
    if (sample) linked.push(sample);
    else if (workflowFallback) workflow.push(...workflowSamples(group));
  }
  const chosen = linked.length ? linked : workflow;
  const found = [];
  for (const sample of chosen) {
    if (!found.some((item) => item.id === sample.id)) found.push(sample);
  }
  return found;
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
 * Scores a tail event only when it has cpuTimeMs or CPUTimeMs (milliseconds,
 * same name Workers Logs and Logpush use). Trace `cpuTime` is left unscored:
 * workers-types do not document its unit, and GraphQL cpuTimeP50 is microseconds.
 */
export function collectTailCpuSamples(events) {
  const samples = [];
  let uploaderLogs = 0;
  let unscoredCpuTime = 0;
  for (const event of events) {
    if (!event || typeof event !== "object") continue;
    const text = eventText(event);
    if (!isUploaderChunk(text)) continue;
    uploaderLogs += 1;
    const cpu = cpuMillis(event);
    if (cpu != null) {
      const id = String(event.eventTimestamp ?? event.$workers?.requestId ?? samples.length);
      if (!samples.some((item) => item.id === id)) samples.push({ id, cpuTimeMs: cpu });
      continue;
    }
    if (typeof event.cpuTime === "number") unscoredCpuTime += 1;
  }
  return { samples, uploaderLogs, unscoredCpuTime };
}

export function explainMissingCpu({ httpStatus, polls, summary, tailConnected, tailEvents, tailUploaderLogs, tailUnscoredCpuTime }) {
  const where = summary.scriptNames.length ? ` scriptName ${summary.scriptNames.join(", ")}` : "";
  const parts = [
    `Workers Logs query HTTP ${httpStatus ?? "n/a"} after ${polls} polls: ${summary.events} events, ${summary.invocations} invocations${where}.`,
  ];
  if (!tailConnected) parts.push("wrangler tail did not connect.");
  else parts.push(`wrangler tail connected: ${tailEvents} events, ${tailUploaderLogs} with an uploader chunk log.`);
  if (tailUnscoredCpuTime > 0) {
    parts.push(
      `${tailUnscoredCpuTime} of those tail events included cpuTime. That field was not scored. Workers Logs publishes cpuTimeMs, and GraphQL cpuTimeP50 is a different unit.`,
    );
  }
  parts.push("No cpuTimeMs sample was returned. No CPU figure was filled in.");
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
  lines.push("", "cpuTimeMs values are the Workers Logs field of that name (or Logpush CPUTimeMs) on uploader chunk or workflow-step events. Empty cells were not filled in.");
  for (const attempt of report.attempts ?? []) {
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
