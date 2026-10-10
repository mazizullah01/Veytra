const STAGES = ["pending", "confirmed", "shipped", "delivered"] as const;

export default function OrderStatusTracker({ status }: { status: string }) {
  const current = Math.max(0, STAGES.indexOf(status as (typeof STAGES)[number]));

  return (
    <ol className="order-tracker" aria-label={`Status: ${status}`}>
      {STAGES.map((stage, index) => {
        const done = index <= current;
        const active = index === current;
        return (
          <li
            key={stage}
            className={`order-tracker__step${done ? " is-done" : ""}${active ? " is-current" : ""}`}
            aria-current={active ? "step" : undefined}
          >
            <span className="order-tracker__dot" aria-hidden />
            <span className="order-tracker__label">{stage}</span>
          </li>
        );
      })}
    </ol>
  );
}
