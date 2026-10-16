/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="./test-shim.d.ts" />
/**
 * Classic View Module Entry Point
 * PRD §13.2 · Ticket workspace#39 (S13)
 *
 * Exports:
 * - ClassicView: Accessible one-page résumé fallback component
 */


export { ClassicView, default } from "./ClassicView";
export type { ClassicViewProps } from "./ClassicView";
export { verifiedProfileFixture } from "./fixtures";
