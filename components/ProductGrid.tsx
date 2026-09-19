import ProductCard from "./ProductCard";
import Reveal from "./Reveal";
import type { Product } from "@/lib/data";

interface ProductGridProps {
  products: Product[];
  /** How many leading cards to load eagerly (above the fold). */
  priorityCount?: number;
  className?: string;
}

export default function ProductGrid({
  products,
  priorityCount = 0,
  className = "",
}: ProductGridProps) {
  return (
    <div className={`grid-products ${className}`.trim()}>
      {products.map((product, index) => (
        <Reveal key={product.id} delay={(index % 4) * 80}>
          <ProductCard product={product} priority={index < priorityCount} />
        </Reveal>
      ))}
    </div>
  );
}
