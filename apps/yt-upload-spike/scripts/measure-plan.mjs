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
  return /not found|does not exist|already deleted|10007|10042|10090|no such|code: 7003|not exist/i.test(text);
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
    observability: { enabled: true, head_sampling_rate: 1 },
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

export function telemetryQueryBody(workerName, from, to) {
  return {
    queryId: `yt-spike-${workerName}-${from}`,
    dry: true,
    view: "events",
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
      needle: { value: '"role":"uploader"', isRegex: false, matchCase: true },
    },
  };
}

function eventText(node) {
  const parts = [];
  if (typeof node.source === "string") parts.push(node.source);
  if (typeof node.$metadata?.message === "string") parts.push(node.$metadata.message);
  if (typeof node.message === "string") parts.push(node.message);
  return parts.join("\n");
}

/**
 * Reads Workers Logs `cpuTimeMs` only when the same event also carries an uploader chunk log.
 * Does not convert GraphQL quantiles and does not fill a number in when the field is absent.
 */
export function collectCpuSamples(value, found = []) {
  if (!value || typeof value !== "object") return found;
  if (Array.isArray(value)) {
    for (const item of value) collectCpuSamples(item, found);
    return found;
  }
  const cpu = value.$workers?.cpuTimeMs ?? value.cpuTimeMs;
  const text = eventText(value);
  if (typeof cpu === "number" && text.includes('"role":"uploader"') && text.includes('"event":"chunk"')) {
    const id = value.$metadata?.id ?? value.$workers?.requestId ?? text.slice(0, 180);
    if (!found.some((item) => item.id === id)) found.push({ id, cpuTimeMs: cpu });
  }
  for (const child of Object.values(value)) {
    if (child && typeof child === "object") collectCpuSamples(child, found);
  }
  return found;
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
  lines.push("", "cpuTimeMs values are the Workers Logs field of that name on uploader chunk events. Empty cells were not filled in.");
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
