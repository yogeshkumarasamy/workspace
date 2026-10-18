import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CHUNK_CANDIDATES_BYTES,
  cloudflareErrorIsMissing,
  collectCpuSamples,
  collectTailCpuSamples,
  COMPATIBILITY_DATE,
  decideNext,
  exitCodeFor,
  explainMissingCpu,
  extractJsonObjects,
  isIgnorableTeardown,
  LONG_VIDEO_BYTES,
  planSweep,
  r2Unavailable,
  renderSummary,
  stepsForRun,
  SWEEP_STEP_BUDGET,
  teardownCommands,
  telemetryQueryBody,
  THROWAWAY_WORKER_NAME,
  throwawayConfig,
  workerUrlFromDeploy,
} from "./measure-plan.mjs";

test("schedules 64 MiB first and stops before the daily step cap", () => {
  const plan = planSweep(LONG_VIDEO_BYTES, 64 * 1024 * 1024);
  assert.equal(plan.runs[0].chunkBytes, 64 * 1024 * 1024);
  assert.equal(plan.runs[0].steps, 9);
  assert.ok(plan.stepsIfEveryScheduledRunExecutes <= SWEEP_STEP_BUDGET);
  assert.ok(plan.skipped.some((row) => row.chunkBytes === 256 * 1024));
  const withSmallest = plan.stepsIfEveryScheduledRunExecutes + stepsForRun(LONG_VIDEO_BYTES, 256 * 1024);
  assert.ok(withSmallest > 3000);
});

test("decides the sweep from real cpuTimeMs only", () => {
  assert.equal(decideNext({ complete: true, checksumMatches: true, cpuTimeMsMax: 9.5 }), "stop-pass");
  assert.equal(decideNext({ complete: true, checksumMatches: true, cpuTimeMsMax: 10 }), "step-down");
  assert.equal(decideNext({ complete: true, checksumMatches: true, cpuTimeMsMax: null }), "stop-no-cpu");
  assert.equal(decideNext({ complete: false, cpuExceeded: true }), "step-down");
  assert.equal(decideNext({ complete: true, checksumMatches: false, cpuTimeMsMax: 1 }), "stop-error");
  assert.equal(exitCodeFor({ attempts: [{ decision: "stop-no-cpu" }] }), 3);
  assert.equal(exitCodeFor({ attempts: [{ decision: "stop-pass", cpuTimeMsMax: 2 }] }), 0);
  assert.equal(exitCodeFor({ infrastructureError: "deploy failed", attempts: [] }), 1);
});

test("reads cpuTimeMs from the uploader event and ignores other numbers", () => {
  const samples = collectCpuSamples({
    result: {
      events: {
        events: [
          {
            "$metadata": { id: "log-1", message: '{"role":"uploader","event":"chunk","offset":0}' },
            "$workers": { cpuTimeMs: 4.25, scriptName: THROWAWAY_WORKER_NAME },
            source: '{"role":"uploader","event":"chunk","offset":0}',
          },
          {
            "$metadata": { id: "sink-1", message: '{"role":"sink","event":"put"}' },
            "$workers": { cpuTimeMs: 99 },
          },
          {
            "$metadata": { id: "bare", message: '{"role":"uploader","event":"chunk","offset":1}' },
          },
        ],
      },
    },
  });
  assert.deepEqual(samples, [{ id: "log-1", cpuTimeMs: 4.25 }]);
});

test("joins cpuTimeMs on a workflow invocation with the sibling uploader log", () => {
  const samples = collectCpuSamples({
    result: {
      invocations: {
        "req-9": [
          {
            "$metadata": { id: "inv-9" },
            "$workers": { cpuTimeMs: 6.5, eventType: "workflow", scriptName: THROWAWAY_WORKER_NAME, requestId: "req-9" },
          },
          {
            "$metadata": { id: "line-9", message: '{"role":"uploader","event":"chunk","offset":0}' },
          },
        ],
      },
    },
  });
  assert.deepEqual(samples, [{ id: "inv-9", cpuTimeMs: 6.5 }]);
});

test("uses workflow cpuTimeMs when the console line was not stored, and ignores fetch CPU", () => {
  const samples = collectCpuSamples({
    result: {
      events: {
        events: [
          { "$metadata": { id: "step-1" }, "$workers": { cpuTimeMs: 8, eventType: "workflow", scriptName: THROWAWAY_WORKER_NAME } },
          { "$metadata": { id: "poll" }, "$workers": { cpuTimeMs: 1, eventType: "fetch", scriptName: THROWAWAY_WORKER_NAME } },
        ],
      },
    },
  });
  assert.deepEqual(samples, [{ id: "step-1", cpuTimeMs: 8 }]);
});

test("an empty Workers Logs response does not invent cpuTimeMs", () => {
  assert.deepEqual(collectCpuSamples({ result: { events: { events: [], count: 0 } } }), []);
  const note = explainMissingCpu({
    httpStatus: 200,
    polls: 6,
    summary: { events: 0, invocations: 0, scriptNames: [] },
    tailConnected: true,
    tailEvents: 4,
    tailUploaderLogs: 2,
    tailUnscoredCpuTime: 2,
  });
  assert.match(note, /HTTP 200/);
  assert.match(note, /was not scored/);
  assert.doesNotMatch(note, /cpuTimeMs was \d/);
});

test("tail CPUTimeMs is scored and bare cpuTime is not", () => {
  const scored = collectTailCpuSamples([
    {
      eventTimestamp: 10,
      CPUTimeMs: 3.25,
      logs: [{ message: ['{"role":"uploader","event":"chunk","offset":0}'] }],
    },
    {
      eventTimestamp: 11,
      cpuTime: 999,
      logs: [{ message: ['{"role":"uploader","event":"chunk","offset":1}'] }],
    },
  ]);
  assert.deepEqual(scored.samples, [{ id: "10", cpuTimeMs: 3.25 }]);
  assert.equal(scored.unscoredCpuTime, 1);
  const pretty = extractJsonObjects('Connected\n{\n  "cpuTimeMs": 2,\n  "logs": [{"message":["{\\"role\\":\\"uploader\\",\\"event\\":\\"chunk\\"}"]}]\n}\n{');
  assert.equal(pretty.objects.length, 1);
  assert.equal(pretty.objects[0].cpuTimeMs, 2);
  assert.match(pretty.rest, /\{/);
});

test("telemetry query does not needle-filter away the invocation, and a missing workflow is success", () => {
  const body = telemetryQueryBody(THROWAWAY_WORKER_NAME, 10, 20);
  assert.equal(body.view, "invocations");
  assert.equal(JSON.stringify(body).includes("needle"), false);
  assert.equal(body.parameters.filters[0].value, THROWAWAY_WORKER_NAME);
  assert.equal(isIgnorableTeardown("Workflow not found [code: 10200]"), true);
  assert.equal(isIgnorableTeardown("\u001b[31mcode: 10200\u001b[0m"), true);
  assert.equal(cloudflareErrorIsMissing(404, {}), true);
  assert.equal(cloudflareErrorIsMissing(400, { errors: [{ code: 10200, message: "still deleting" }] }), true);
  assert.equal(cloudflareErrorIsMissing(400, { errors: [{ code: 10000, message: "Authentication error" }] }), false);
  const config = throwawayConfig({ includeR2: false });
  assert.equal(config.observability.logs.invocation_logs, true);
  assert.equal(config.observability.head_sampling_rate, 1);
});

test("throwaway config has no cron, no queue, and a workers.dev name", () => {
  const config = throwawayConfig({ includeR2: true });
  assert.equal(config.name, THROWAWAY_WORKER_NAME);
  assert.equal(config.compatibility_date, COMPATIBILITY_DATE);
  assert.equal(JSON.stringify(config).includes("crons"), false);
  assert.equal(JSON.stringify(config).includes("queues"), false);
  const commands = teardownCommands().map((args) => args.join(" "));
  assert.ok(commands.some((line) => line.includes("workflows delete")));
  assert.ok(commands.some((line) => line.includes("delete yt-spike-gha-throwaway --force")));
  assert.ok(commands.some((line) => line.startsWith("wrangler r2 bucket delete")));
  assert.equal(r2Unavailable("Please enable R2 through the Cloudflare Dashboard"), true);
  assert.equal(r2Unavailable("Authentication error"), false);
  assert.equal(
    workerUrlFromDeploy("Deployed https://yt-spike-gha-throwaway.coderdevelopment.workers.dev"),
    "https://yt-spike-gha-throwaway.coderdevelopment.workers.dev",
  );
});

test("summary does not invent a CPU figure", () => {
  const markdown = renderSummary({
    sourceMode: "runner",
    r2Detail: "Please enable R2",
    attempts: [
      {
        chunkBytes: CHUNK_CANDIDATES_BYTES[0],
        steps: 9,
        complete: true,
        checksumMatches: true,
        cpuTimeMs: [],
        cpuTimeMsMax: null,
        decision: "stop-no-cpu",
      },
    ],
    skipped: [],
    teardown: ["wrangler delete yt-spike-gha-throwaway --force ok"],
  });
  assert.match(markdown, /not returned/);
  assert.match(markdown, /payment method/);
  assert.match(markdown, /YouTube was not called/);
  assert.doesNotMatch(markdown, /cpuTimeMs max \| [0-9]/);
});

test("the measure workflow is manual and does not run on push or pull request", () => {
  const text = readFileSync(new URL("../../../.github/workflows/yt-upload-spike-measure.yml", import.meta.url), "utf8");
  assert.match(text, /name: Y0 Workers Free CPU measure/);
  assert.match(text, /workflow_dispatch:/);
  assert.equal(text.includes("pull_request"), false);
  assert.equal(text.includes("\n  push:"), false);
  assert.match(text, /yt-spike-gha-throwaway/);
  assert.match(text, /524288000/);
  assert.equal(text.includes("youtube.com"), false);
  assert.match(text, /node-version: "22"/);
  assert.equal(text.includes("node-version-file:"), false);
});
