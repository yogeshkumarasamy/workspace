import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const serviceNameSchema = z.enum(["ib-console-api", "ib-customer-api"]);

export const healthResponseSchema = z
  .object({
    ok: z.literal(true),
    service: serviceNameSchema.openapi({
      description: "Which Innings Break Worker produced this response",
    }),
    sha: z.string().min(1).openapi({
      description: "Git sha of the build the Worker is serving",
    }),
  })
  .openapi("HealthResponse");

export const orderStatusSchema = z
  .enum([
    "Confirmed",
    "Accepted",
    "Preparing",
    "InTransit",
    "Delivered",
    "Completed",
    "Cancelled",
  ])
  .openapi({
    description:
      "Status shared by the Team Manager app and the console. InTransit is the dispatched state.",
  });

export const daytimeSlotSchema = z.enum(["06:30", "10:30", "14:30"]).openapi({
  description: "Daytime match slot: 6:30 AM, 10:30 AM, or 2:30 PM",
});

export const orderSchema = z
  .object({
    id: z.string().min(1),
    status: orderStatusSchema,
    matchDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .openapi({ description: "Match date as YYYY-MM-DD" }),
    slot: daytimeSlotSchema,
    groundLabel: z.string().min(1),
    totalMinor: z.number().int().nonnegative().openapi({
      description: "Amount paid, in paise",
    }),
    currency: z.literal("INR"),
    version: z.number().int().positive().openapi({
      description: "Optimistic concurrency version",
    }),
  })
  .openapi("Order");

export const errorSchema = z
  .object({
    code: z.string().min(1),
    message: z.string().min(1),
  })
  .openapi("ErrorBody");

export const orderIdParamsSchema = z.object({
  orderId: z.string().min(1),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type ErrorBody = z.infer<typeof errorSchema>;
