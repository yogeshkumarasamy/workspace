import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serializeOpenApiDocument } from "../src/openapi";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const target = path.join(packageRoot, "openapi.json");

writeFileSync(target, serializeOpenApiDocument());
console.log(`wrote ${path.relative(process.cwd(), target)}`);
