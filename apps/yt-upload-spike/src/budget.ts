/**
 * Free-plan arithmetic for Y0. Figures are the published caps (see README),
 * not a measurement. CPU milliseconds are intentionally absent.
 */

export const YOUTUBE_ALIGNMENT_BYTES = 256 * 1024;
export const LONG_VIDEO_BYTES = 500 * 1024 * 1024;
/** Planning ceiling for one Short. A Short at or under the chunk size is one step. */
export const SHORT_PLANNING_BYTES = 64 * 1024 * 1024;
export const MAX_SINK_CHUNK_BYTES = 64 * 1024 * 1024;

export const FREE_PLAN = {
  cpuMsPerInvocation: 10,
  requestsPerDay: 100_000,
  subrequestsPerInvocation: 50,
  /** Status query + source GET + sink PUT inside one chunk step. */
  subrequestsPerChunkStep: 3,
  workflowStepsPerDay: 3_000,
  workflowStepsPerInstance: 1_024,
  /**
   * Chunk steps plus one status step must stay under the 1,024 instance cap.
   * 1,020 leaves a handful of steps for a forced-interruption marker in tests.
   */
  workflowStepsPerInstanceBudget: 1_020,
  queueOpsPerDay: 10_000,
  /** A delivered message is one write, one read, and one delete. */
  queueOpsPerMessage: 3,
  /** Cloudflare Free account cap on a request body entering a Worker. Decimal MB. */
  incomingRequestBodyBytes: 100 * 1000 * 1000,
} as const;

export const VOLUME = {
  typicalShortsPerWeek: 6,
  typicalLongsPerWeek: 1,
  maxUploadsPerWeek: 15,
  maxUploadsPerMonth: 60,
} as const;

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
] as const;

export function stepsFor(bytes: number, chunkBytes: number): number {
  if (chunkBytes < 1) throw new Error("chunkBytes must be positive");
  return Math.ceil(bytes / chunkBytes);
}

export function instancesFor(chunkSteps: number): number {
  const roomForChunks = FREE_PLAN.workflowStepsPerInstanceBudget - 1;
  return Math.max(1, Math.ceil(chunkSteps / roomForChunks));
}

export interface DayBudget {
  chunkBytes: number;
  longSteps: number;
  shortSteps: number;
  instancesPerLong: number;
  typicalWeekSteps: number;
  typicalPiledDaySteps: number;
  maxMixPiledDaySteps: number;
  envelopePiledDaySteps: number;
  queueOpsTypicalPiledDay: number;
  fitsTypicalPiledDay: boolean;
  fitsMaxMixPiledDay: boolean;
  fitsEnvelopePiledDay: boolean;
  fitsInstanceCap: boolean;
  fitsSubrequests: boolean;
  fitsIncomingBody: boolean;
}

/**
 * Daily caps are what bind. A month does not pool steps.
 * - typical: 6 Shorts + 1 long
 * - max mix: 14 Shorts + 1 long (15 uploads, one of them long)
 * - envelope: 15 longs of LONG_VIDEO_BYTES on one UTC day
 * Shorts use SHORT_PLANNING_BYTES. Spread-out weeks peak on the long video's day.
 */
export function dayBudget(chunkBytes: number): DayBudget {
  const longSteps = stepsFor(LONG_VIDEO_BYTES, chunkBytes);
  const shortSteps = stepsFor(SHORT_PLANNING_BYTES, chunkBytes);
  const typicalWeekSteps = longSteps + VOLUME.typicalShortsPerWeek * shortSteps;
  const typicalPiledDaySteps = typicalWeekSteps;
  const maxMixPiledDaySteps = longSteps + (VOLUME.maxUploadsPerWeek - 1) * shortSteps;
  const envelopePiledDaySteps = VOLUME.maxUploadsPerWeek * longSteps;
  const queueOpsTypicalPiledDay = typicalPiledDaySteps * FREE_PLAN.queueOpsPerMessage;
  return {
    chunkBytes,
    longSteps,
    shortSteps,
    instancesPerLong: instancesFor(longSteps),
    typicalWeekSteps,
    typicalPiledDaySteps,
    maxMixPiledDaySteps,
    envelopePiledDaySteps,
    queueOpsTypicalPiledDay,
    fitsTypicalPiledDay: typicalPiledDaySteps <= FREE_PLAN.workflowStepsPerDay,
    fitsMaxMixPiledDay: maxMixPiledDaySteps <= FREE_PLAN.workflowStepsPerDay,
    fitsEnvelopePiledDay: envelopePiledDaySteps <= FREE_PLAN.workflowStepsPerDay,
    fitsInstanceCap: instancesFor(longSteps) === 1,
    fitsSubrequests: FREE_PLAN.subrequestsPerChunkStep <= FREE_PLAN.subrequestsPerInvocation,
    fitsIncomingBody: chunkBytes <= FREE_PLAN.incomingRequestBodyBytes,
  };
}

export function budgetTable(): DayBudget[] {
  return CHUNK_CANDIDATES_BYTES.map((chunk) => dayBudget(chunk));
}
