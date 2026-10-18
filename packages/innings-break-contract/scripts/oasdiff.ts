import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

export const OASDIFF_VERSION = "1.33.0";

interface OasdiffChange {
  id?: string;
  text?: string;
  level?: number;
  operation?: string;
  path?: string;
}

export interface OasdiffResult {
  breaking: boolean;
  changes: OasdiffChange[];
}

function assetName(): string {
  if (process.platform === "darwin")
    return `oasdiff_${OASDIFF_VERSION}_darwin_all.tar.gz`;
  const arch =
    process.arch === "x64"
      ? "amd64"
      : process.arch === "arm64"
        ? "arm64"
        : null;
  if (process.platform !== "linux" || !arch) {
    throw new Error(
      `oasdiff ${OASDIFF_VERSION} has no binary for ${process.platform}/${process.arch}`,
    );
  }
  return `oasdiff_${OASDIFF_VERSION}_linux_${arch}.tar.gz`;
}

export function ensureOasdiff(repoRoot: string): string {
  const dir = path.join(repoRoot, ".cache", "oasdiff", OASDIFF_VERSION);
  const bin = path.join(
    dir,
    process.platform === "win32" ? "oasdiff.exe" : "oasdiff",
  );
  if (existsSync(bin)) return bin;

  const staging = path.join(
    repoRoot,
    ".cache",
    "oasdiff",
    `${OASDIFF_VERSION}.staging-${process.pid}`,
  );
  mkdirSync(staging, { recursive: true });
  const archive = path.join(staging, "oasdiff.tar.gz");
  const url = `https://github.com/oasdiff/oasdiff/releases/download/v${OASDIFF_VERSION}/${assetName()}`;
  const curl = spawnSync(
    "curl",
    ["-fsSL", "--retry", "3", "-o", archive, url],
    { encoding: "utf8" },
  );
  if (curl.status !== 0) {
    throw new Error(
      `Failed to download oasdiff ${OASDIFF_VERSION}: ${curl.stderr || curl.stdout}`,
    );
  }
  const tar = spawnSync("tar", ["-xzf", archive, "-C", staging], {
    encoding: "utf8",
  });
  if (tar.status !== 0) {
    throw new Error(`Failed to extract oasdiff: ${tar.stderr || tar.stdout}`);
  }
  const staged = path.join(
    staging,
    process.platform === "win32" ? "oasdiff.exe" : "oasdiff",
  );
  if (!existsSync(staged)) {
    throw new Error(`oasdiff archive did not contain a binary at ${staged}`);
  }
  chmodSync(staged, 0o755);
  mkdirSync(dir, { recursive: true });
  if (!existsSync(bin)) {
    const moved = spawnSync("mv", [staged, bin], { encoding: "utf8" });
    if (moved.status !== 0 && !existsSync(bin)) {
      throw new Error(
        `Failed to install oasdiff binary: ${moved.stderr || moved.stdout}`,
      );
    }
  }
  rmSync(staging, { recursive: true, force: true });
  return bin;
}

export function oasdiffBreaking(
  repoRoot: string,
  baseFile: string,
  headFile: string,
): OasdiffResult {
  const bin = ensureOasdiff(repoRoot);
  const result = spawnSync(
    bin,
    ["breaking", baseFile, headFile, "--format", "json", "--fail-on", "ERR"],
    { encoding: "utf8" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(
      `oasdiff breaking failed (${result.status}): ${result.stderr || result.stdout}`,
    );
  }
  const parsed: unknown = result.stdout.trim() ? JSON.parse(result.stdout) : [];
  const changes = Array.isArray(parsed) ? (parsed as OasdiffChange[]) : [];
  const breaking =
    result.status === 1 || changes.some((change) => (change.level ?? 0) >= 3);
  return { breaking, changes };
}
