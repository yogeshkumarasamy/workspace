declare const process: {
  argv: string[];
  cwd(): string;
  exit(code: number): never;
};

declare module "node:assert/strict" {
  interface Assert {
    equal(actual: unknown, expected: unknown, message?: string): void;
    strictEqual(actual: unknown, expected: unknown, message?: string): void;
    ok(value: unknown, message?: string): void;
    match(actual: string, expected: RegExp, message?: string): void;
    doesNotMatch(actual: string, expected: RegExp, message?: string): void;
  }
  const assert: Assert;
  export default assert;
}

declare module "node:fs" {
  export function readFileSync(path: string, encoding: "utf8"): string;
}

declare module "node:url" {
  export function fileURLToPath(url: URL | string): string;
}

declare module "node:module" {
  export function register(
    specifier: string | URL,
    parentURL?: string | URL,
    options?: Record<string, unknown>,
  ): void;
}

declare module "vitest" {
  export const describe: (name: string, fn: () => void) => void;
  export const it: (name: string, fn: () => void) => void;
  export const expect: (actual: unknown) => {
    toEqual: (expected: unknown) => void;
    toBe: (expected: unknown) => void;
    toContain: (expected: unknown) => void;
    toBeDefined: () => void;
  };
}
