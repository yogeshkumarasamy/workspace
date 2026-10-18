/**
 * Subrequest caps for one Workflow instance on Workers Free.
 *
 * Workers limits (12 Oct 2026) and Workflows limits (21 Sep 2026): 50 external
 * fetch subrequests per invocation, and 1,000 subrequests to Cloudflare
 * services (D1, KV, R2). PR #123 measured that every step.do in one instance
 * shares that invocation. The D1 limits page (21 Apr 2026) still says 50
 * queries on Free under the older "read subrequest limits" label. D1 is
 * counted on the 1,000 internal ledger, not against the 50. A normal upload
 * therefore hands off after 16 chunk steps (3 * 16 = 48). The internal ledger
 * stops the instance sooner only when the next chunk would pass 1,000.
 * `limits.subrequests` and `limits.cpu_ms` are Paid knobs and are not set.
 *
 * This file does not import the upload spike. The 16-chunk ceiling matches
 * that spike's result for a different reason: there the opening status probe
 * is its own subrequest (1 + 3 * 16 = 49). Here the probe is inside the chunk.
 */

export const FREE_EXTERNAL_SUBREQUESTS = 50;
export const FREE_INTERNAL_SUBREQUESTS = 1000;

/** Status probe + source GET + sink PUT. Charged for the in-process mock too, so tests hit the same handoff as production. */
export const CHUNK_EXTERNAL_SUBREQUESTS = 3;

/**
 * D1 statements a chunk step can issue: getJob, uploadProgress, getChannel,
 * saveUpload, plus the mock media status read, source read, sink read, and
 * sink write. Live pays the four store queries. Reserve the ceiling.
 */
export const CHUNK_INTERNAL_SUBREQUESTS = 8;

/** saveUpload, getJob, updateJob, workflow create, saveUpload of the new instance id. */
export const HANDOFF_INTERNAL_SUBREQUESTS = 5;

export interface SubrequestSpend {
  external: number;
  internal: number;
}

export function chunkStepCost(extraExternal = 0): SubrequestSpend {
  return { external: CHUNK_EXTERNAL_SUBREQUESTS + extraExternal, internal: CHUNK_INTERNAL_SUBREQUESTS };
}

export function handoffStepCost(): SubrequestSpend {
  return { external: 0, internal: HANDOFF_INTERNAL_SUBREQUESTS };
}

/**
 * Mock finish is D1 only. Live finish may set a thumbnail and walk playlists.
 * The ceiling is what must fit before the finish step starts; otherwise the
 * next instance finishes on a fresh budget.
 */
export function finishStepCost(mode: "mock" | "live"): SubrequestSpend {
  if (mode === "mock") return { external: 0, internal: 8 };
  return { external: 8, internal: 16 };
}

export function addSpend(left: SubrequestSpend, right: SubrequestSpend): SubrequestSpend {
  return { external: left.external + right.external, internal: left.internal + right.internal };
}

/** Chunk steps that still fit in the external cap. 3 * 16 = 48, so the 17th is not started. */
export function maxChunkStepsPerInstance(externalAlready = 0): number {
  const room = FREE_EXTERNAL_SUBREQUESTS - externalAlready;
  if (room < CHUNK_EXTERNAL_SUBREQUESTS) return 0;
  return Math.floor(room / CHUNK_EXTERNAL_SUBREQUESTS);
}

export class InstanceBudget {
  external = 0;
  internal = 0;

  constructor(
    readonly externalLimit = FREE_EXTERNAL_SUBREQUESTS,
    readonly internalLimit = FREE_INTERNAL_SUBREQUESTS,
  ) {}

  fits(cost: SubrequestSpend): boolean {
    return this.external + cost.external <= this.externalLimit && this.internal + cost.internal <= this.internalLimit;
  }

  spend(cost: SubrequestSpend): void {
    this.external += cost.external;
    this.internal += cost.internal;
  }
}

/** Workflows throws this once the platform cap is already exceeded. */
export function isSubrequestLimitError(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  return /too many subrequests/i.test(text);
}
