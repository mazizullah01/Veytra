import ProductHealthDetail from "@/components/admin/ProductHealthDetail";

export default async function ProductHealthDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  return <ProductHealthDetail productId={productId} />;
}
