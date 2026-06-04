'use client';

import { useEffect } from 'react';
import { useCartStore } from '@/lib/cart-store';

export default function CartToast() {
  const cartToast = useCartStore((s) => s.cartToast);
  const clearCartToast = useCartStore((s) => s.clearCartToast);

  useEffect(() => {
    if (!cartToast) return;
    const id = window.setTimeout(() => clearCartToast(), 3000);
    return () => window.clearTimeout(id);
  }, [cartToast, clearCartToast]);

  if (!cartToast) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-6 left-1/2 z-[200] max-w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0"
    >
      <div className="toast-enter pointer-events-auto flex items-center gap-3 rounded-lg border border-[#E8DFD0] bg-[#FDFBF7] px-4 py-3 shadow-lg">
        <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
        <p className="text-sm font-medium text-black">{cartToast}</p>
        <button
          type="button"
          onClick={clearCartToast}
          className="ml-1 rounded p-1 text-[var(--text-secondary)] hover:bg-black/5 hover:text-black"
          aria-label="Dismiss"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
