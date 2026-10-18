export {
  daytimeSlotSchema,
  errorSchema,
  healthResponseSchema,
  orderIdParamsSchema,
  orderSchema,
  orderStatusSchema,
  serviceNameSchema,
} from "./schemas";
export type { ErrorBody, HealthResponse, Order, OrderStatus } from "./schemas";
export { authorizedPersonas, routes } from "./routes";
export type { AuthorizedPersona, HttpMethod, Route, RouteDef } from "./routes";
export { buildOpenApiDocument, serializeOpenApiDocument } from "./openapi";

export const CONTRACT_PACKAGE_NAME = "@contracts/innings-break";
