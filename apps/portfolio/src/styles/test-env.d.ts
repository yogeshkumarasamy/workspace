/**
 * Ambient type declarations for test environment
 * Owned by S02 under src/styles/
 */

declare module "node:test" {
  type TestFn = () => void | Promise<void>;
  function test(name: string, fn: TestFn): void;
  export default test;
}

declare module "node:assert/strict" {
  interface Assert {
    ok(value: unknown, message?: string): void;
    equal(actual: unknown, expected: unknown, message?: string): void;
  }
  const assert: Assert;
  export default assert;
}

declare module "node:fs" {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding?: string): string;
  export function readdirSync(path: string): string[];
  export function statSync(path: string): { size: number };
}

declare module "node:path" {
  export function resolve(...paths: string[]): string;
  export function join(...paths: string[]): string;
}

declare module "node:url" {
  export function fileURLToPath(url: URL | string): string;
}

declare module "node:zlib" {
  export function gzipSync(buf: Uint8Array | string): Uint8Array;
}
