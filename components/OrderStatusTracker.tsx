const STAGES = [
  { key: "pending", label: "Order Placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
] as const;

export default function OrderStatusTracker({ status }: { status: string }) {
  if (status === "cancelled" || status === "canceled") {
    return <p className="order-tracker order-tracker--cancelled">Cancelled</p>;
  }
  const current = Math.max(
    0,
    STAGES.findIndex((stage) => stage.key === status),
  );

  return (
    <ol className="order-tracker" aria-label={`Status: ${status}`}>
      {STAGES.map((stage, index) => {
        const done = index <= current;
        const active = index === current;
        return (
          <li
            key={stage.key}
            className={`order-tracker__step${done ? " is-done" : ""}${active ? " is-current" : ""}`}
            aria-current={active ? "step" : undefined}
          >
            <span className="order-tracker__dot" aria-hidden />
            <span className="order-tracker__label">{stage.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
