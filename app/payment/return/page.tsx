import PaymentReturnView from "@/components/PaymentReturnView";
export default async function PaymentReturnPage({ searchParams }: { searchParams: Promise<{ session_id?: string | string[] }> }) {
  const { session_id } = await searchParams;
  return <PaymentReturnView sessionId={typeof session_id === "string" ? session_id : ""} />;
}
