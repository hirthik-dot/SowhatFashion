'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { cartItemKey } from '@/lib/product-colors';

export interface CartItem {
  productId: string;
  name: string;
  image: string;
  size: string;
  color?: string;
  colorHex?: string;
  quantity: number;
  price: number;
  discountPrice: number;
}

interface CartStore {
  items: CartItem[];
  cartToast: string | null;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (productId: string, size: string, color?: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number, color?: string) => void;
  clearCart: () => void;
  clearCartToast: () => void;
  getTotalAmount: () => number;
  getTotalItems: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartToast: null,

      addItem: (item, quantity = 1) => {
        set((state) => {
          const key = cartItemKey(item.productId, item.size, item.color);
          const existingIndex = state.items.findIndex(
            (i) => cartItemKey(i.productId, i.size, i.color) === key
          );

          if (existingIndex > -1) {
            const newItems = [...state.items];
            newItems[existingIndex].quantity += quantity;
            return { items: newItems, cartToast: 'Added to cart' };
          }

          return {
            items: [...state.items, { ...item, quantity }],
            cartToast: 'Added to cart',
          };
        });
      },

      clearCartToast: () => set({ cartToast: null }),

      removeItem: (productId, size, color) => {
        const key = cartItemKey(productId, size, color);
        set((state) => ({
          items: state.items.filter(
            (i) => cartItemKey(i.productId, i.size, i.color) !== key
          ),
        }));
      },

      updateQuantity: (productId, size, quantity, color) => {
        if (quantity <= 0) {
          get().removeItem(productId, size, color);
          return;
        }
        const key = cartItemKey(productId, size, color);
        set((state) => ({
          items: state.items.map((i) =>
            cartItemKey(i.productId, i.size, i.color) === key
              ? { ...i, quantity }
              : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotalAmount: () => {
        return get().items.reduce((total, item) => {
          const price = item.discountPrice > 0 ? item.discountPrice : item.price;
          return total + price * item.quantity;
        }, 0);
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
    }),
    {
      name: 'sowaat-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
