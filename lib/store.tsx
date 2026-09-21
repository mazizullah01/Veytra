"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** A line item in the cart. We snapshot just what the UI needs. */
export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  size: string;
  qty: number;
}

export const FREE_SHIPPING_THRESHOLD = 75;
export const SHIPPING_FLAT = 9.95;

const STORAGE_KEY = "veytra.cart.v1";

interface CartContextValue {
  items: CartItem[];
  /** True once localStorage has been read (avoids SSR/hydration badge mismatch). */
  ready: boolean;
  count: number;
  subtotal: number;
  shipping: number;
  total: number;
  add: (item: Omit<CartItem, "qty">, qty?: number) => void;
  remove: (id: string, size: string) => void;
  updateQty: (id: string, size: string, qty: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Defensive shape check — never trust persisted JSON.
    return parsed.filter(
      (item): item is CartItem =>
        item &&
        typeof item.id === "string" &&
        typeof item.size === "string" &&
        typeof item.qty === "number" &&
        typeof item.price === "number",
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  // Read persisted cart AFTER mount so the SSR output (empty) matches the first
  // client render, then hydrate. This is what prevents a hydration mismatch on
  // the nav badge. Deferred a tick to avoid flushing state synchronously in an
  // effect body.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setItems(readStorage());
      setReady(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  // Persist on every change, but only once the initial read has happened.
  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage full / disabled — cart still works for the session */
    }
  }, [items, ready]);

  const add = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const index = prev.findIndex(
        (line) => line.id === item.id && line.size === item.size,
      );
      if (index >= 0) {
        const next = [...prev];
        next[index] = { ...next[index], qty: next[index].qty + qty };
        return next;
      }
      return [...prev, { ...item, qty }];
    });
  }, []);

  const remove = useCallback((id: string, size: string) => {
    setItems((prev) =>
      prev.filter((line) => !(line.id === id && line.size === size)),
    );
  }, []);

  const updateQty = useCallback((id: string, size: string, qty: number) => {
    setItems((prev) =>
      prev
        .map((line) =>
          line.id === id && line.size === size
            ? { ...line, qty: Math.max(0, qty) }
            : line,
        )
        .filter((line) => line.qty > 0),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((sum, line) => sum + line.qty, 0);
    const subtotal = items.reduce((sum, line) => sum + line.price * line.qty, 0);
    const shipping =
      subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
    return {
      items,
      ready,
      count,
      subtotal,
      shipping,
      total: subtotal + shipping,
      add,
      remove,
      updateQty,
      clear,
    };
  }, [items, ready, add, remove, updateQty, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
