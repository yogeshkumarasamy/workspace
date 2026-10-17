import { orderSchema, type Order } from "@contracts/innings-break";

export function parseOrder(input: unknown): Order {
  return orderSchema.parse(input);
}
