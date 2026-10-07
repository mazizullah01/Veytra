import PaymentView from "@/components/PaymentView";
export default async function PaymentPage({ params, searchParams }: { params: Promise<{ orderId: string }>; searchParams: Promise<{ cancelled?: string }> }) {
  const { orderId } = await params;
  const { cancelled } = await searchParams;
  return <PaymentView orderId={orderId} cancelled={cancelled === "true"} />;
}
