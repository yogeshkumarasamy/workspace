import type { ZodTypeAny } from "zod";
import {
  errorSchema,
  healthResponseSchema,
  orderIdParamsSchema,
  orderSchema,
} from "./schemas";

export const authorizedPersonas = [
  "Team Manager",
  "Business Owner",
  "Operations Manager",
] as const;

export type AuthorizedPersona = (typeof authorizedPersonas)[number];

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

export interface RouteDef {
  method: HttpMethod;
  path: string;
  operationId: string;
  tags: readonly string[];
  summary: string;
  authorizedPersonas: readonly AuthorizedPersona[];
  params?: ZodTypeAny;
  response: ZodTypeAny;
  responseDescription: string;
  errors?: Readonly<
    Record<string, { description: string; schema: ZodTypeAny }>
  >;
}

export const routes = [
  {
    method: "get",
    path: "/health",
    operationId: "getHealth",
    tags: ["platform"],
    summary:
      "Build probe used by deploy smoke tests and by every signed-in persona",
    authorizedPersonas: [
      "Team Manager",
      "Business Owner",
      "Operations Manager",
    ],
    response: healthResponseSchema,
    responseDescription: "This Worker is serving the build identified by sha",
  },
  {
    method: "get",
    path: "/customer/v1/orders/{orderId}",
    operationId: "getCustomerOrder",
    tags: ["customer"],
    summary: "Read one team order",
    authorizedPersonas: ["Team Manager"],
    params: orderIdParamsSchema,
    response: orderSchema,
    responseDescription: "The order placed for the team",
    errors: {
      "404": { description: "No such order", schema: errorSchema },
    },
  },
  {
    method: "get",
    path: "/console/v1/orders/{orderId}",
    operationId: "getConsoleOrder",
    tags: ["console"],
    summary: "Read one kitchen order",
    authorizedPersonas: ["Business Owner", "Operations Manager"],
    params: orderIdParamsSchema,
    response: orderSchema,
    responseDescription: "The order as seen by console staff",
    errors: {
      "404": { description: "No such order", schema: errorSchema },
    },
  },
] as const satisfies readonly RouteDef[];

export type Route = (typeof routes)[number];
