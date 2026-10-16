/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "vitest" {
  export const beforeEach: (fn: () => void | Promise<void>) => void;
  export const afterEach: (fn: () => void | Promise<void>) => void;
  export const vi: {
    fn: (impl?: (...args: any[]) => any) => any;
    spyOn: (obj: any, method: string) => any;
    stubGlobal: (key: string, val: any) => void;
    unstubAllGlobals: () => void;
    clearAllMocks: () => void;
    resetAllMocks: () => void;
    restoreAllMocks: () => void;
    useFakeTimers: () => void;
    useRealTimers: () => void;
    advanceTimersByTime: (ms: number) => void;
  };
  export interface FullAssertion {
    toBe: (expected: unknown) => void;
    toEqual: (expected: unknown) => void;
    toContain: (expected: unknown) => void;
    toBeTruthy: () => void;
    toBeFalsy: () => void;
    toBeNull: () => void;
    toBeUndefined: () => void;
    toHaveLength: (expected: number) => void;
    toThrow: (expected?: unknown) => void;
    toBeGreaterThan: (expected: number) => void;
    toBeLessThan: (expected: number) => void;
    toHaveBeenCalled: () => void;
    toHaveBeenCalledWith: (...args: any[]) => void;
    not: FullAssertion;
  }
  export function expect(actual: unknown): FullAssertion;
}
