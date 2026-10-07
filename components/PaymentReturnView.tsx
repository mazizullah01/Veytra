"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLink from "./AppLink";
import { CheckIcon } from "./Icons";
import { paymentRequest } from "./PaymentView";
import { useAuth } from "@/lib/store";
import { errorMessage } from "@/lib/insforge";

interface Result { orderId: string; stripePaid: boolean; paymentStatus: string; status: string }
export default function PaymentReturnView({ sessionId }: { sessionId: string }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [failure, setFailure] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace(`/login?next=${encodeURIComponent(`/payment/return?session_id=${encodeURIComponent(sessionId)}`)}`); return; }
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function read(attempt = 0) {
      try {
        if (!sessionId) throw new Error("No checkout session was provided. View your orders to continue payment.");
        const data: Result = await paymentRequest(`/api/stripe/payment-status?session_id=${encodeURIComponent(sessionId)}`);
        if (!active) return;
        setResult(data); setFailure("");
        // The webhook may arrive after Stripe redirects. Read only; never confirm payment here.
        if (data.stripePaid && data.paymentStatus !== "paid" && attempt < 5) timer = setTimeout(() => void read(attempt + 1), 2000);
      } catch (error) { if (active) setFailure(errorMessage(error)); }
    }
    void read();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [sessionId, user, loading, router, revision]);
  if (!result && !failure) return <div className="section container" style={{ paddingBlock: "6rem" }}><div className="loader" /></div>;
  const confirmed = result?.stripePaid && result.paymentStatus === "paid";
  return <div className="confirmation">
    {confirmed && <span className="confirmation__mark"><CheckIcon size={30} /></span>}
    <span className="eyebrow">Stripe checkout</span>
    <h1>{failure ? "Unable to check payment" : result?.stripePaid ? "Payment successful" : "Payment is not complete"}</h1>
    {result && <><p className="confirmation__order" style={{ overflowWrap: "anywhere" }}>Order #{result.orderId}</p>
      <p>Payment status: {result.paymentStatus === "paid" ? "Paid" : "Unpaid"}</p><p style={{ textTransform: "capitalize" }}>Order status: {result.status}</p>
      {result.stripePaid && !confirmed && <p role="status">Stripe received your payment. We’re waiting for payment confirmation to update your order.</p>}
      {!result.stripePaid && <><p>Your payment has not completed. Your order will stay unpaid until Stripe confirms payment.</p><AppLink href={`/payment/${result.orderId}`} className="btn btn--solid"><span>Return to payment</span></AppLink></>}
    </>}
    {failure && <p className="field__error" role="alert">{failure}</p>}
    {!confirmed && <button className="btn btn--outline" onClick={() => setRevision(value => value + 1)}><span>Check payment again</span></button>}
    <AppLink href="/profile" className="link-underline">View My Orders</AppLink>
  </div>;
}
