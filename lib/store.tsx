"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";

import { insforge, errorMessage, type StoreUser } from "./insforge";
import { getProductById } from "./api";

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
  flush: () => Promise<void>;
}

interface AuthContextValue { user: StoreUser | null; loading: boolean; }
const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });
export const useAuth = () => useContext(AuthContext);
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
        typeof item.name === "string" &&
        typeof item.image === "string" &&
        Number.isInteger(item.qty) && item.qty > 0 && item.qty <= 99 &&
        typeof item.price === "number" && Number.isFinite(item.price),
    );
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  const [user, setUser] = useState<StoreUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState("");
  const owner = useRef<string | null>(null);
  const baseline = useRef<CartItem[]>([]);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const generation = useRef(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const version = ++generation.current;
      setReady(false);
      const { data, error } = await insforge.auth.getCurrentUser();
      if (!active || version !== generation.current) return;
      const nextUser = error ? null : data.user;
      setUser(nextUser);
      setLoading(false);
      owner.current = nextUser?.id ?? null;
      if (!nextUser) {
        baseline.current = [];
        setItems(readStorage());
        setReady(true);
        return;
      }
      try {
        await queue.current.catch(() => {});
        const { data: rows, error: cartError } = await insforge.database.from("carts")
          .select("product_id,size,quantity").eq("user_id", nextUser.id).limit(100);
        if (cartError) throw cartError;
        const remoteRows = rows ?? [];
        const remoteProducts = await Promise.all(
          remoteRows.map((row) => getProductById(row.product_id)),
        );
        const remote: CartItem[] = [];
        remoteRows.forEach((row, index) => {
          const product = remoteProducts[index];
          if (product) {
            remote.push({
              id: product.id,
              name: product.name,
              price: product.price,
              image: product.images[0],
              size: row.size,
              qty: row.quantity,
            });
          }
        });
        if (!active || version !== generation.current) return;
        baseline.current = remote;
        const merged = remote.map(line => ({ ...line }));
        const guests = readStorage();
        const guestProducts = await Promise.all(guests.map((guest) => getProductById(guest.id)));
        guests.forEach((guest, index) => {
          const product = guestProducts[index];
          if (!product || !product.sizes.includes(guest.size)) return;
          const line = merged.find(line => line.id === guest.id && line.size === guest.size);
          if (line) line.qty = Math.min(99, line.qty + guest.qty);
          else merged.push({ ...guest, name: product.name, price: product.price, image: product.images[0], qty: Math.min(99, guest.qty) });
        });
        if (!active || version !== generation.current) return;
        setItems(merged);
        setReady(true);
      } catch (error) {
        if (active) setSyncError(errorMessage(error));
      }
    };
    void load();
    const unsubscribe = insforge.auth.onAuthStateChange(event => {
      if (event !== "tokenRefreshed") void load();
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  const sync = useCallback(async (snapshot: CartItem[], userId: string) => {
    if (owner.current !== userId) return;
    const previous = baseline.current;
    for (const old of previous) {
      if (snapshot.some(line => line.id === old.id && line.size === old.size)) continue;
      const { error } = await insforge.database.from("carts").delete()
        .eq("user_id", userId).eq("product_id", old.id).eq("size", old.size);
      if (error) throw error;
    }
    for (const line of snapshot) {
      const old = previous.find(old => old.id === line.id && old.size === line.size);
      if (old?.qty === line.qty) continue;
      // Query first so retrying a partially successful sync cannot duplicate a line.
      const { data, error: lookupError } = await insforge.database.from("carts").select("id")
        .eq("user_id", userId).eq("product_id", line.id).eq("size", line.size).maybeSingle();
      if (lookupError) throw lookupError;
      const values = { user_id: userId, product_id: line.id, size: line.size, quantity: line.qty, updated_at: new Date().toISOString() };
      const { error } = data
        ? await insforge.database.from("carts").update(values).eq("id", data.id).eq("user_id", userId)
        : await insforge.database.from("carts").insert([values]);
      if (error) throw error;
    }
    baseline.current = snapshot;
    window.localStorage.removeItem(STORAGE_KEY);
    setSyncError("");
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* session cart still works */ }
      return;
    }
    queue.current = queue.current.catch(() => {}).then(() => sync(items, user.id));
    void queue.current.catch(error => setSyncError(errorMessage(error)));
  }, [items, ready, user, sync]);

  const flush = useCallback(async () => {
    await queue.current;
    if (owner.current) await sync(items, owner.current);
  }, [items, sync]);

  const add = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const index = prev.findIndex(
        (line) => line.id === item.id && line.size === item.size,
      );
      if (index >= 0) {
        const next = [...prev];
        next[index] = { ...next[index], qty: Math.min(99, next[index].qty + qty) };
        return next;
      }
      return [...prev, { ...item, qty: Math.max(1, Math.min(99, qty)) }];
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
            ? { ...line, qty: Math.max(0, Math.min(99, qty)) }
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
      flush,
    };
  }, [items, ready, add, remove, updateQty, clear, flush]);

  const authValue = useMemo<AuthContextValue>(
    () => ({ user, loading }),
    [user, loading],
  );

  return <AuthContext.Provider value={authValue}>
    <CartContext.Provider value={value}>
      {syncError && <p className="field__error" role="alert" style={{ padding: "1rem" }}>Cart could not sync: {syncError}. <button onClick={() => { if (!ready) window.location.reload();
        else void flush().catch(error => setSyncError(errorMessage(error))); }}>Retry</button></p>}
      {children}
    </CartContext.Provider>
  </AuthContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
