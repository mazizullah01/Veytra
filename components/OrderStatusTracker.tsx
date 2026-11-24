const STAGES = [
  { key: "pending", label: "Order Placed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
] as const;

export default function OrderStatusTracker({
  status,
  placedLabel,
  variant = "default",
}: {
  status: string;
  placedLabel?: string;
  variant?: "default" | "confirm";
}) {
  if (status === "cancelled" || status === "canceled") {
    return <p className="order-tracker order-tracker--cancelled">Cancelled</p>;
  }
  const current = Math.max(
    0,
    STAGES.findIndex((stage) => stage.key === status),
  );

  return (
    <ol
      className={`order-tracker${variant === "confirm" ? " order-tracker--confirm" : ""}`}
      aria-label={`Status: ${status}`}
    >
      {STAGES.map((stage, index) => {
        const done = index <= current;
        const active = index === current;
        const dateLabel =
          done && stage.key === "pending"
            ? placedLabel
            : done && stage.key === "confirmed"
              ? placedLabel
              : undefined;
        return (
          <li
            key={stage.key}
            className={`order-tracker__step${done ? " is-done" : ""}${active ? " is-current" : ""}`}
            aria-current={active ? "step" : undefined}
          >
            <span className="order-tracker__dot" aria-hidden>
              {done && (
                <svg viewBox="0 0 16 16" width="12" height="12" fill="none" aria-hidden>
                  <path
                    d="M3.5 8.5 6.5 11.5 12.5 4.5"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span className="order-tracker__label">{stage.label}</span>
            {dateLabel && <span className="order-tracker__date">{dateLabel}</span>}
          </li>
        );
      })}
    </ol>
  );
}
