/** Customer-facing order reference helpers. Internal IDs remain UUIDs. */

export function formatOrderNumber(value: string | null | undefined, fallbackId?: string): string {
  const ref = value?.trim();
  if (ref) return ref.startsWith("#") ? ref : `#${ref}`;
  if (fallbackId) return `Order ${fallbackId.slice(0, 8)}`;
  return "Order";
}

export function paymentStatusLabel(status: string): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "refunded":
      return "Refunded";
    default:
      return "Unpaid";
  }
}

export function orderStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pending";
    case "confirmed":
      return "Confirmed";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "cancelled":
    case "canceled":
      return "Cancelled";
    default:
      return status;
  }
}

export function paymentStatusClass(status: string): string {
  switch (status) {
    case "paid":
      return "status-badge status-badge--paid";
    case "refunded":
      return "status-badge status-badge--refunded";
    default:
      return "status-badge status-badge--unpaid";
  }
}

export function orderStatusClass(status: string): string {
  switch (status) {
    case "pending":
      return "status-badge status-badge--pending";
    case "confirmed":
      return "status-badge status-badge--confirmed";
    case "shipped":
      return "status-badge status-badge--shipped";
    case "delivered":
      return "status-badge status-badge--delivered";
    case "cancelled":
    case "canceled":
      return "status-badge status-badge--cancelled";
    default:
      return "status-badge";
  }
}
