"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/data";
import { money } from "@/lib/format";
import { useCart } from "@/lib/store";
import Img from "./Img";
import { useToast } from "./Toaster";

interface ProductCardProps {
  product: Product;
  /** Pass true for above-the-fold cards to prioritise image loading. */
  priority?: boolean;
  sizes?: string;
}

export default function ProductCard({
  product,
  priority = false,
  sizes = "(max-width: 620px) 100vw, (max-width: 1100px) 33vw, 25vw",
}: ProductCardProps) {
  const { add } = useCart();
  const toast = useToast();
  const [picking, setPicking] = useState(false);

  const hoverImage = product.images[1] ?? product.images[0];
  const onSale =
    typeof product.compareAtPrice === "number" &&
    product.compareAtPrice > product.price;

  const quickAdd = (size: string) => {
    add({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      size,
    });
    toast({ message: `${product.name} · size ${size}` });
    setPicking(false);
  };

  return (
    <article className="product-card">
      <div className="product-card__media">
        <Link
          href={`/product/${product.id}`}
          className="product-card__link"
          aria-label={product.name}
        >
          <Img
            className="product-card__img product-card__img--primary"
            src={product.images[0]}
            alt={product.name}
            fill
            sizes={sizes}
            priority={priority}
          />
          <Img
            className="product-card__img product-card__img--hover"
            src={hoverImage}
            alt=""
            fill
            sizes={sizes}
            aria-hidden
          />
        </Link>

        <span className="product-card__flags">
          {onSale && <span className="flag flag--sale">Sale</span>}
          {product.isNew && <span className="flag flag--new">New</span>}
        </span>

        {!picking && (
          <button
            type="button"
            className="quick-add"
            onClick={() => setPicking(true)}
          >
            Quick add
          </button>
        )}

        {picking && (
          <span className="product-card__sizes">
            {product.sizes.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => quickAdd(size)}
              >
                {size}
              </button>
            ))}
          </span>
        )}
      </div>

      <Link href={`/product/${product.id}`} className="product-card__body">
        <span className="product-card__name">{product.name}</span>
        <span className="product-card__meta">{product.subcategory}</span>
        <span className="product-card__price">
          {money(product.price)}
          {onSale && (
            <span className="product-card__compare">
              {money(product.compareAtPrice as number)}
            </span>
          )}
        </span>
      </Link>
    </article>
  );
}
