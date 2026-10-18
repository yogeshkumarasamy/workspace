import assert from "node:assert/strict";
import test from "node:test";
import { buildOpenApiDocument, serializeOpenApiDocument } from "../src/openapi";
import { routes } from "../src/routes";
import { orderSchema } from "../src/schemas";

test("order schema accepts a confirmed team order", () => {
  const parsed = orderSchema.parse({
    id: "ord_1",
    status: "Confirmed",
    matchDate: "2026-10-18",
    slot: "06:30",
    groundLabel: "Marina Cricket Arena — Ground #1",
    totalMinor: 25000,
    currency: "INR",
    version: 1,
  });
  assert.equal(parsed.status, "Confirmed");
});

test("order schema rejects an unknown status", () => {
  assert.throws(() =>
    orderSchema.parse({
      id: "ord_1",
      status: "Draft",
      matchDate: "2026-10-18",
      slot: "06:30",
      groundLabel: "Marina",
      totalMinor: 1,
      currency: "INR",
      version: 1,
    }),
  );
});

test("openapi document lists every route and its personas", () => {
  const document = buildOpenApiDocument();
  assert.equal(document.openapi, "3.0.3");
  for (const route of routes) {
    const operation = document.paths?.[route.path]?.[route.method] as
      | { operationId?: string; "x-authorized-personas"?: string[] }
      | undefined;
    assert.ok(operation, `${route.method} ${route.path}`);
    assert.equal(operation.operationId, route.operationId);
    assert.deepEqual(operation["x-authorized-personas"], [
      ...route.authorizedPersonas,
    ]);
  }
});

test("openapi serialization is stable", () => {
  assert.equal(serializeOpenApiDocument(), serializeOpenApiDocument());
});
