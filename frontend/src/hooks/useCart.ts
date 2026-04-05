'use client';

import { useCartStore } from '@/lib/cart-store';

export function useCart() {
  const store = useCartStore();

  return {
    items: store.items,
    addItem: store.addItem,
    removeItem: store.removeItem,
    updateQuantity: store.updateQuantity,
    clearCart: store.clearCart,
    totalAmount: store.getTotalAmount(),
    totalItems: store.getTotalItems(),
  };
}
