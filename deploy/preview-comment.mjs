#!/usr/bin/env node
/**
 * Renders the sticky PR wiring comment markdown table from a plan.json
 * or planner report.
 *
 * Usage:
 *   node deploy/preview-comment.mjs [--plan plan.json] [--out comment.md]
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderPreviewComment, renderPreviewTable } from "./plan.mjs";

export { renderPreviewComment, renderPreviewTable };

export function parseArgs(argv = process.argv.slice(2)) {
  const args = {
    planFile: "plan.json",
    outFile: null,
    targetsPath: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--plan") {
      args.planFile = argv[++i];
    } else if (token === "--out") {
      args.outFile = argv[++i];
    } else if (token === "--targets") {
      args.targetsPath = argv[++i];
    } else if (token === "--help" || token === "-h") {
      console.log("Usage: preview-comment.mjs [--plan plan.json] [--out comment.md] [--targets targets.json]");
      process.exit(0);
    }
  }

  return args;
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const planPath = path.resolve(process.cwd(), args.planFile);
  let planData;
  try {
    planData = JSON.parse(readFileSync(planPath, "utf8"));
  } catch (err) {
    throw new Error(`Failed to read plan file at ${planPath}: ${err.message}`);
  }

  const comment = renderPreviewComment(planData, {
    targetsPath: args.targetsPath ? path.resolve(process.cwd(), args.targetsPath) : undefined,
  });

  if (args.outFile) {
    writeFileSync(path.resolve(process.cwd(), args.outFile), `${comment}\n`);
  } else {
    process.stdout.write(`${comment}\n`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
