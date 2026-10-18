import { existsSync } from "node:fs";
import path from "node:path";

export function findRepoRoot(start: string): string {
  let dir = path.resolve(start);
  while (!existsSync(path.join(dir, "pnpm-workspace.yaml"))) {
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`Could not find pnpm-workspace.yaml from ${start}`);
    }
    dir = parent;
  }
  return dir;
}

export const OPENAPI_RELATIVE_PATH =
  "packages/innings-break-contract/openapi.json";
