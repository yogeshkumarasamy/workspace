declare module "vitest" {
  export const beforeEach: (fn: () => void | Promise<void>) => void;
  export const afterEach: (fn: () => void | Promise<void>) => void;
  export const vi: {
    fn: <T = unknown>(impl?: (...args: unknown[]) => unknown) => T;
    spyOn: (obj: unknown, method: string) => unknown;
    useFakeTimers: () => void;
    useRealTimers: () => void;
    advanceTimersByTime: (ms: number) => void;
    restoreAllMocks: () => void;
  };
}
