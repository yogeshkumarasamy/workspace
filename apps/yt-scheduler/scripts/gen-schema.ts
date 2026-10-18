import { writeFileSync } from "node:fs";
import { zodToJsonSchema } from "zod-to-json-schema";
import { JobInputSchema, MetadataSchema } from "../src/schema.js";

writeFileSync("schema/metadata.schema.json", JSON.stringify(zodToJsonSchema(MetadataSchema, { name: "Metadata", target: "jsonSchema7", effectStrategy: "input" }), null, 2) + "\n");
writeFileSync("schema/job.schema.json", JSON.stringify(zodToJsonSchema(JobInputSchema, { name: "Job", target: "jsonSchema7", effectStrategy: "input" }), null, 2) + "\n");
