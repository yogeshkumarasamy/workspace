import { describe, expect, it } from "vitest";
import {
  CHUNK_CANDIDATES_BYTES,
  FREE_PLAN,
  LONG_VIDEO_BYTES,
  SHORT_PLANNING_BYTES,
  VOLUME,
  budgetTable,
  dayBudget,
  instancesFor,
  stepsFor,
} from "../src/budget";

describe("free-plan budget", () => {
  it("counts a 500 MiB file at the chunk sizes the spike measures", () => {
    expect(stepsFor(LONG_VIDEO_BYTES, 64 * 1024 * 1024)).toBe(8);
    expect(stepsFor(LONG_VIDEO_BYTES, 32 * 1024 * 1024)).toBe(16);
    expect(stepsFor(LONG_VIDEO_BYTES, 16 * 1024 * 1024)).toBe(32);
    expect(stepsFor(LONG_VIDEO_BYTES, 256 * 1024)).toBe(2000);
    expect(instancesFor(2000)).toBe(2);
    expect(instancesFor(8)).toBe(1);
  });

  it("fits the stated week at 64 MiB and blows the step cap at 256 KiB", () => {
    const large = dayBudget(64 * 1024 * 1024);
    expect(large.typicalPiledDaySteps).toBe(14);
    expect(large.maxMixPiledDaySteps).toBe(22);
    expect(large.envelopePiledDaySteps).toBe(120);
    expect(large.fitsTypicalPiledDay).toBe(true);
    expect(large.fitsMaxMixPiledDay).toBe(true);
    expect(large.fitsEnvelopePiledDay).toBe(true);
    expect(large.fitsInstanceCap).toBe(true);
    expect(large.fitsSubrequests).toBe(true);
    expect(large.fitsIncomingBody).toBe(true);
    expect(large.queueOpsTypicalPiledDay).toBe(42);

    const tiny = dayBudget(256 * 1024);
    expect(tiny.fitsTypicalPiledDay).toBe(false);
    expect(tiny.fitsInstanceCap).toBe(false);
    expect(tiny.queueOpsTypicalPiledDay).toBeGreaterThan(FREE_PLAN.queueOpsPerDay);
  });

  it("keeps every candidate aligned and within the sink body cap", () => {
    for (const chunk of CHUNK_CANDIDATES_BYTES) {
      expect(chunk % (256 * 1024)).toBe(0);
      expect(chunk).toBeLessThanOrEqual(FREE_PLAN.incomingRequestBodyBytes);
    }
    expect(SHORT_PLANNING_BYTES).toBe(64 * 1024 * 1024);
    expect(VOLUME.maxUploadsPerWeek).toBe(15);
    expect(VOLUME.maxUploadsPerMonth).toBe(60);
    expect(VOLUME.typicalShortsPerWeek + VOLUME.typicalLongsPerWeek).toBe(7);
    const table = budgetTable();
    expect(table.some((row) => row.fitsEnvelopePiledDay)).toBe(true);
    expect(table.some((row) => !row.fitsEnvelopePiledDay)).toBe(true);
  });
});
