import {
  OpenApiGeneratorV3,
  OpenAPIRegistry,
} from "@asteasolutions/zod-to-openapi";
import type { ZodTypeAny } from "zod";
import { routes } from "./routes";

interface JsonResponse {
  description: string;
  content: { "application/json": { schema: ZodTypeAny } };
}

export function buildOpenApiDocument() {
  const registry = new OpenAPIRegistry();
  for (const route of routes) {
    const responses: Record<string, JsonResponse> = {
      "200": {
        description: route.responseDescription,
        content: {
          "application/json": {
            schema: route.response,
          },
        },
      },
    };
    if ("errors" in route && route.errors) {
      for (const [status, error] of Object.entries(route.errors)) {
        responses[status] = {
          description: error.description,
          content: {
            "application/json": {
              schema: error.schema,
            },
          },
        };
      }
    }
    registry.registerPath({
      method: route.method,
      path: route.path,
      operationId: route.operationId,
      tags: [...route.tags],
      summary: route.summary,
      request:
        "params" in route && route.params
          ? { params: route.params }
          : undefined,
      responses,
    });
  }

  const generator = new OpenApiGeneratorV3(registry.definitions);
  const document = generator.generateDocument({
    openapi: "3.0.3",
    info: {
      title: "Innings Break",
      version: "0.1.0",
      description:
        "Shared contract for the Innings Break customer API and console API. Both apps import these schemas.",
    },
    tags: [
      { name: "platform", description: "Probes" },
      { name: "customer", description: "Team Manager routes" },
      {
        name: "console",
        description: "Business Owner and Operations Manager routes",
      },
    ],
  });

  for (const route of routes) {
    const operation = document.paths?.[route.path]?.[route.method];
    if (!operation) {
      throw new Error(
        `OpenAPI document is missing ${route.method.toUpperCase()} ${route.path}`,
      );
    }
    (operation as { "x-authorized-personas"?: readonly string[] })[
      "x-authorized-personas"
    ] = [...route.authorizedPersonas];
  }

  return document;
}

export function serializeOpenApiDocument(
  document: ReturnType<typeof buildOpenApiDocument> = buildOpenApiDocument(),
): string {
  return `${JSON.stringify(document, null, 2)}\n`;
}
