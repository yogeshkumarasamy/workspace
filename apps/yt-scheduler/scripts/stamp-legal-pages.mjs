#!/usr/bin/env node
/**
 * Rewrite dist/privacy and dist/terms after Vite copies public/.
 * Vite's public copy can land after plugin closeBundle, so the build script
 * runs this once the dist directory is final.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeAppBase } from "../base-path.mjs";
import { stampDist } from "../legal-pages.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.resolve(process.argv[2] ?? path.join(root, "dist"));
const base = normalizeAppBase();
stampDist(dist, base, root);
console.log(`stamped legal pages (${base})`);
