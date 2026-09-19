"use client";

import { useState } from "react";
import type { Product } from "@/lib/data";
import { useCart } from "@/lib/store";
import { MinusIcon, PlusIcon } from "./Icons";
import { useToast } from "./Toaster";

export default function AddToCart({ product }: { product: Product }) {
  const { add } = useCart();
  const toast = useToast();
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    if (!size) {
      setError("Please select a size to continue.");
      return;
    }
    setError(null);
    add(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images[0],
        size,
      },
      qty,
    );
    toast({
      message: `${product.name} · size ${size} · qty ${qty}`,
    });
  };

  return (
    <div>
      <div className="option-group">
        <div className="option-group__head">
          <span className="eyebrow">Size</span>
          <button type="button" className="muted" style={{ fontSize: "0.75rem" }}>
            Size guide
          </button>
        </div>
        <div className="size-list" role="group" aria-label="Select a size">
          {product.sizes.map((option) => (
            <button
              key={option}
              type="button"
              className={`size ${size === option ? "is-active" : ""}`}
              aria-pressed={size === option}
              onClick={() => {
                setSize(option);
                setError(null);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="option-group">
        <div className="option-group__head">
          <span className="eyebrow">Quantity</span>
        </div>
        <div className="qty">
          <button
            type="button"
            aria-label="Decrease quantity"
            onClick={() => setQty((value) => Math.max(1, value - 1))}
          >
            <MinusIcon size={16} />
          </button>
          <span className="qty__value" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            aria-label="Increase quantity"
            onClick={() => setQty((value) => Math.min(10, value + 1))}
          >
            <PlusIcon size={16} />
          </button>
        </div>
      </div>

      <div className="pdp__actions">
        <button type="button" className="btn btn--solid" onClick={handleAdd}>
          <span>Add to Cart</span>
        </button>
      </div>
      {error && <p className="pdp__note">{error}</p>}
    </div>
  );
}
