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

export type CartItem = {
  photoId: string;
  eventId: string;
  eventTitle: string;
  thumbUrl: string;
  masterPath: string;
  title: string | null;
  pricePerPhoto: number;
  createdAt: number | null;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  total: number;
  add: (item: CartItem) => void;
  remove: (photoId: string) => void;
  has: (photoId: string) => boolean;
  clear: () => void;
  toggle: (item: CartItem) => void;
};

const STORAGE_KEY = "event_cart";

const CartContext = createContext<CartContextValue | null>(null);

function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(loadCart());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveCart(items);
  }, [items, hydrated]);

  const add = useCallback((item: CartItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.photoId === item.photoId)) return prev;
      return [...prev, item];
    });
  }, []);

  const remove = useCallback((photoId: string) => {
    setItems((prev) => prev.filter((i) => i.photoId !== photoId));
  }, []);

  const has = useCallback(
    (photoId: string) => items.some((i) => i.photoId === photoId),
    [items]
  );

  const clear = useCallback(() => setItems([]), []);

  const toggle = useCallback((item: CartItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.photoId === item.photoId)) {
        return prev.filter((i) => i.photoId !== item.photoId);
      }
      return [...prev, item];
    });
  }, []);

  const count = items.length;
  const total = useMemo(
    () => items.reduce((sum, i) => sum + (i.pricePerPhoto || 0), 0),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({ items, count, total, add, remove, has, clear, toggle }),
    [items, count, total, add, remove, has, clear, toggle]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve estar dentro de <CartProvider>");
  return ctx;
}
