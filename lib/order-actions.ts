/** Which profile actions an order can take. Safe to import from client components. */

export interface OrderActionInput {
  status: string;
  payment_status: string;
}

export function canCancelOrder(order: OrderActionInput): boolean {
  if (order.status === "cancelled" || order.status === "canceled") return false;
  if (order.payment_status === "unpaid") return order.status === "pending";
  if (order.payment_status === "paid") return order.status === "confirmed";
  return false;
}

export function canRequestReturn(order: OrderActionInput): boolean {
  if (order.payment_status !== "paid") return false;
  return order.status === "confirmed" || order.status === "shipped" || order.status === "delivered";
}
