"use client";

/** Animated green success mark — plays once when mounted. */
export default function PaymentSuccessMark() {
  return (
    <div className="pay-success__mark" aria-hidden>
      <svg className="pay-success__burst" viewBox="0 0 120 120" fill="none">
        <line className="pay-success__stroke pay-success__stroke--g" x1="60" y1="8" x2="60" y2="18" />
        <line className="pay-success__stroke pay-success__stroke--y" x1="96" y1="24" x2="88" y2="32" />
        <line className="pay-success__stroke pay-success__stroke--p" x1="104" y1="60" x2="94" y2="60" />
        <line className="pay-success__stroke pay-success__stroke--g" x1="96" y1="96" x2="88" y2="88" />
        <line className="pay-success__stroke pay-success__stroke--y" x1="60" y1="112" x2="60" y2="102" />
        <line className="pay-success__stroke pay-success__stroke--p" x1="24" y1="96" x2="32" y2="88" />
        <line className="pay-success__stroke pay-success__stroke--g" x1="16" y1="60" x2="26" y2="60" />
        <line className="pay-success__stroke pay-success__stroke--y" x1="24" y1="24" x2="32" y2="32" />
      </svg>
      <div className="pay-success__circle">
        <svg className="pay-success__check" viewBox="0 0 52 52" fill="none">
          <path
            className="pay-success__check-path"
            d="M14 27.5 22.5 36 38 18"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
