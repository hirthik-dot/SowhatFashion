'use client';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/utils';
import { useEffect, useState } from 'react';

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalAmount, totalItems } = useCart();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null; // Prevent hydration mismatch

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface)]">
      <Navbar variant="default" />
      
      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 md:py-16 w-full">
        <h1 className="text-3xl font-playfair font-bold uppercase tracking-widest mb-10 text-center md:text-left">
          Shopping Cart
        </h1>

        {items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-[var(--border)] shadow-sm">
            <div className="w-24 h-24 mx-auto mb-6 opacity-20">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
            </div>
            <h2 className="text-2xl font-playfair mb-4">Your cart is empty</h2>
            <p className="text-[var(--text-secondary)] mb-8">Looks like you haven't added anything to your cart yet.</p>
            <Link href="/products" className="btn-gold rounded px-8">Continue Shopping</Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Cart Items */}
            <div className="w-full lg:w-2/3">
              <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
                <div className="hidden md:grid grid-cols-12 gap-4 p-6 border-b border-[var(--border)] bg-gray-50 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  <div className="col-span-6">Product</div>
                  <div className="col-span-2 text-center">Price</div>
                  <div className="col-span-2 text-center">Quantity</div>
                  <div className="col-span-2 text-right">Total</div>
                </div>

                <div className="divide-y divide-[var(--border)]">
                  {items.map((item) => {
                    const price = item.discountPrice > 0 ? item.discountPrice : item.price;
                    const itemTotal = price * item.quantity;
                    
                    return (
                      <div key={`${item.productId}-${item.size}`} className="p-4 md:p-6 flex flex-row md:grid md:grid-cols-12 gap-0 md:gap-4 items-center bg-white border-b border-[var(--border)] relative">
                        {/* Product Info Mobile Combo */}
                        <div className="w-20 h-24 relative bg-gray-100 rounded border border-[var(--border)] overflow-hidden shrink-0 mr-4 md:hidden">
                          <Image src={item.image || '/placeholder.jpg'} alt={item.name} fill className="object-cover" />
                        </div>
                        
                        <div className="flex-1 flex flex-col justify-between md:hidden">
                          <div className="flex justify-between items-start">
                            <div className="pr-2">
                              <Link href={`/products/${item.productId}`} className="font-bold text-sm leading-tight hover:text-[var(--gold)] line-clamp-2">{item.name}</Link>
                              <p className="text-xs text-[var(--text-secondary)] mt-1">Size: <span className="font-bold text-black">{item.size}</span></p>
                            </div>
                            <button onClick={() => removeItem(item.productId, item.size)} className="p-2 -mr-2 -mt-2 text-gray-400 hover:text-[var(--sale-red)] shrink-0">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>
                          
                          <div className="flex justify-between items-end mt-3">
                            <span className="font-bold">{formatPrice(price)}</span>
                            
                            <div className="flex items-center border border-[var(--border)] rounded overflow-hidden">
                              <button onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)} className="w-[44px] h-[36px] flex items-center justify-center hover:bg-gray-100 bg-gray-50">-</button>
                              <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)} className="w-[44px] h-[36px] flex items-center justify-center hover:bg-gray-100 bg-gray-50">+</button>
                            </div>
                          </div>
                        </div>

                        {/* Desktop Layout Elements */}
                        <div className="hidden md:flex col-span-6 items-center gap-6 w-full">
                          <div className="w-20 h-24 relative bg-gray-100 rounded border border-[var(--border)] overflow-hidden shrink-0">
                            <Image src={item.image || '/placeholder.jpg'} alt={item.name} fill className="object-cover" />
                          </div>
                          <div>
                            <Link href={`/products/${item.productId}`} className="font-bold text-lg hover:text-[var(--gold)] transition-colors">{item.name}</Link>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">Size: <span className="font-bold text-black">{item.size}</span></p>
                          </div>
                        </div>

                        <div className="col-span-2 text-center hidden md:block">
                          <span className="font-semibold">{formatPrice(price)}</span>
                        </div>

                        <div className="col-span-2 hidden md:flex justify-center w-full md:w-auto">
                          <div className="flex items-center border border-[var(--border)] rounded">
                            <button onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)} className="px-3 py-1 hover:bg-gray-100">-</button>
                            <span className="px-3 font-medium text-sm">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)} className="px-3 py-1 hover:bg-gray-100">+</button>
                          </div>
                        </div>

                        <div className="col-span-2 text-right hidden md:block">
                          <span className="font-bold text-lg">{formatPrice(itemTotal)}</span>
                          <button onClick={() => removeItem(item.productId, item.size)} className="block mt-2 text-xs text-[var(--text-secondary)] underline hover:text-[var(--sale-red)] ml-auto">Remove</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="w-full lg:w-1/3">
              <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm p-6 sticky top-[100px]">
                <h3 className="text-xl font-playfair font-bold uppercase tracking-widest border-b border-[var(--border)] pb-4 mb-6">Order Summary</h3>
                
                <div className="space-y-4 text-sm text-[var(--text-secondary)] mb-6 border-b border-[var(--border)] pb-6">
                  <div className="flex justify-between">
                    <span>Subtotal ({totalItems} items)</span>
                    <span className="font-bold text-black">{formatPrice(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery</span>
                    <span className="text-[var(--success)] font-bold">Free</span>
                  </div>
                </div>

                <div className="flex justify-between items-end mb-8">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-2xl">{formatPrice(totalAmount)}</span>
                </div>

                <Link href="/checkout" className="btn-gold w-full block text-center rounded py-4 shadow hover:shadow-lg">
                  PROCEED TO CHECKOUT
                </Link>

                <p className="text-xs text-center text-gray-400 mt-4 flex items-center justify-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Secure Checkout
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
