import { createContext, useContext, useState, useEffect, useCallback, createElement } from "react";

const CartContext = createContext(null);
const CART_KEY = "pokevault_cart";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((listing) => {
    setItems((prev) => {
      if (prev.find((i) => i.id === listing.id)) return prev;
      return [...prev, {
        id: listing.id,
        name: listing.name,
        image_small: listing.image_small,
        image_large: listing.image_large,
        asking_price: listing.asking_price,
        platform_fee: listing.platform_fee || 3,
        set_name: listing.set_name,
        number: listing.number,
        condition: listing.condition,
        variant: listing.variant,
        rarity: listing.rarity,
        seller_id: listing.created_by_id,
      }];
    });
  }, []);

  const removeItem = useCallback((id) => setItems((prev) => prev.filter((i) => i.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);
  const has = useCallback((id) => items.some((i) => i.id === id), [items]);

  return createElement(
    CartContext.Provider,
    { value: { items, addItem, removeItem, clear, has, count: items.length } },
    children
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}