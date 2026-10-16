/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "node:assert/strict" {
  const assert: any;
  export default assert;
}

declare module "vitest" {
  export const describe: any;
  export const it: any;
  export const test: any;
  export const expect: any;
  export const beforeEach: any;
  export const afterEach: any;
  export const vi: any;
  export const assert: any;
}

