'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { createOrder } from '@/lib/api';
import { buildWhatsAppOrderLink } from '@/lib/whatsapp';
import Navbar from '@/components/layout/Navbar';
import { IconHome } from '@/components/icons/PremiumIcons';
import Image from 'next/image';
import { cartItemKey, isValidHex, normalizeHex } from '@/lib/product-colors';

export default function CheckoutPage() {
  const { items, totalAmount, clearCart } = useCart();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    line1: '',
    city: '',
    state: '',
    pincode: '',
  });

  const { user, isLoggedIn, openAuthModal, setUser } = useAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && items.length === 0 && !orderPlaced) {
      router.push('/cart');
    }
  }, [mounted, items.length, router, orderPlaced]);

  useEffect(() => {
    if (user && formData.name === '') {
      setFormData((prev) => ({
        ...prev,
        name: user.name,
        email: user.email,
        line1: user.savedAddresses?.[0]?.line1 || prev.line1,
        city: user.savedAddresses?.[0]?.city || prev.city,
        state: user.savedAddresses?.[0]?.state || prev.state,
        pincode: user.savedAddresses?.[0]?.pincode || prev.pincode,
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setLoading(true);
    try {
      const orderItems = items.map((item) => ({
        product: item.productId,
        name: item.name,
        image: item.image,
        size: item.size,
        color: item.color || '',
        colorHex: item.colorHex || '',
        quantity: item.quantity,
        price: item.discountPrice > 0 ? item.discountPrice : item.price,
      }));

      const orderData = {
        customer: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: {
            line1: formData.line1,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
          },
        },
        items: orderItems,
        totalAmount,
      };

      const order = await createOrder(orderData);
      if (!order?._id) {
        throw new Error(order?.message || 'Failed to create order');
      }

      if (isLoggedIn && user) {
        try {
          const token = localStorage.getItem('token');
          const headers: HeadersInit = {};
          if (token) headers['Authorization'] = `Bearer ${token}`;
          const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/me`, {
            credentials: 'include',
            headers,
          });
          if (meRes.ok) {
            const meData = await meRes.json();
            if (meData.success && meData.user?.savedAddresses) {
              setUser({ ...user, savedAddresses: meData.user.savedAddresses });
            }
          }
        } catch {
          // non-blocking
        }
      }

      const address = `${formData.line1}, ${formData.city}, ${formData.state} ${formData.pincode}`;
      const whatsappUrl = buildWhatsAppOrderLink({
        customerName: formData.name,
        items: orderItems,
        totalAmount,
        address,
      });
      window.open(whatsappUrl, '_blank');

      setOrderPlaced(true);
      router.replace(`/order/${order._id}`);
      clearCart();
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Error placing order. Please try again later.');
      setLoading(false);
    }
  };

  if (!mounted || items.length === 0) return null;

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <Navbar variant="minimal" />

      <main className="max-w-7xl mx-auto px-4 py-8 md:py-24">
        <div className="flex flex-col lg:flex-row gap-6 md:gap-10">
          <div className="lg:hidden bg-white border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => setSummaryOpen(!summaryOpen)}
              className="w-full flex justify-between items-center p-4 bg-gray-50 font-bold"
            >
              <span className="flex items-center gap-2 text-[var(--gold)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 01-8 0" />
                </svg>
                {summaryOpen ? 'Hide' : 'Show'} Order Summary
              </span>
              <span>{formatPrice(totalAmount)}</span>
            </button>
            <div className={`${summaryOpen ? 'block' : 'hidden'} p-4 border-t border-[var(--border)]`}>
              <div className="flex flex-col gap-4 mb-4">
                {items.map((item) => (
                  <div key={cartItemKey(item.productId, item.size, item.color)} className="flex gap-4">
                    <div className="relative w-16 h-20 bg-gray-100 rounded overflow-hidden border shrink-0">
                      <Image src={item.image || '/placeholder.jpg'} alt={item.name} fill className="object-cover" />
                      <span className="absolute -top-1 -right-1 bg-gray-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full z-10 border border-white">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.name}</p>
                      <p className="text-xs text-[var(--text-secondary)] my-1">
                        Size: {item.size}
                        {item.color && (
                          <>
                            {' · '}
                            <span className="inline-flex items-center gap-1">
                              {item.colorHex && isValidHex(item.colorHex) && (
                                <span className="inline-block w-2.5 h-2.5 rounded-full border border-gray-300" style={{ backgroundColor: normalizeHex(item.colorHex) }} />
                              )}
                              {item.color}
                            </span>
                          </>
                        )}
                      </p>
                      <p className="font-bold text-sm">
                        {formatPrice(item.discountPrice > 0 ? item.discountPrice : item.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2 text-sm border-t border-[var(--border)] pt-4">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Subtotal</span>
                  <span>{formatPrice(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Shipping</span>
                  <span className="text-[var(--success)] font-bold">Free</span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-3/5 pb-24 md:pb-0">
            <h1 className="text-3xl font-playfair font-bold mb-6 md:mb-8 hidden md:block">Checkout</h1>

            <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-8 bg-white p-4 md:p-8 rounded-xl border border-[var(--border)] shadow-sm">
              <section>
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h2 className="text-xl font-bold font-playfair flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-sans">
                      1
                    </span>{' '}
                    Contact Information
                  </h2>
                  {!isLoggedIn && (
                    <button type="button" onClick={() => openAuthModal()} className="text-sm text-[var(--gold)] font-bold hover:underline">
                      Login to checkout fast
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Full Name</label>
                    <input
                      required
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full h-[48px] border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Email Address</label>
                    <input
                      required
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full h-[48px] border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Phone Number</label>
                    <input
                      required
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full h-[48px] border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold font-playfair mb-4 flex items-center gap-2 border-b pb-2 mt-8">
                  <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-sans">
                    2
                  </span>{' '}
                  Shipping Address
                </h2>

                {isLoggedIn && user?.savedAddresses && user.savedAddresses.length > 0 && (
                  <div className="mb-6 space-y-3">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block">Select Saved Address</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {user.savedAddresses.map((addr: any, idx) => (
                        <div
                          key={idx}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              line1: addr.line1,
                              city: addr.city,
                              state: addr.state,
                              pincode: addr.pincode,
                            }))
                          }
                          className={`p-3 rounded-lg border cursor-pointer hover:border-[var(--gold)] transition-colors ${
                            formData.line1 === addr.line1 && formData.pincode === addr.pincode
                              ? 'border-[var(--gold)] bg-[var(--gold)]/5'
                              : 'border-[var(--border)] bg-gray-50'
                          }`}
                        >
                          <div className="font-bold text-sm flex justify-between">
                            <span className="flex items-center gap-1.5">
                              <IconHome size={14} className="text-[var(--gold)] shrink-0" />
                              {addr.label} {addr.isDefault && '(Default)'}
                            </span>
                            {formData.line1 === addr.line1 && formData.pincode === addr.pincode && (
                              <span className="text-[var(--gold)]">✓</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">{addr.line1}</div>
                          <div className="text-xs text-gray-600">
                            {addr.city}, {addr.state} {addr.pincode}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Address Line 1</label>
                    <input
                      required
                      type="text"
                      name="line1"
                      value={formData.line1}
                      onChange={handleChange}
                      className="w-full h-[48px] border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]"
                      placeholder="House/Flat No., Street Name"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">City</label>
                    <input
                      required
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      className="w-full h-[48px] border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">State</label>
                    <input
                      required
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className="w-full h-[48px] border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]"
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Pincode</label>
                    <input
                      required
                      pattern="[0-9]*"
                      inputMode="numeric"
                      type="number"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      className="w-full h-[48px] border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]"
                    />
                  </div>
                </div>
              </section>

              <div className="pt-4 lg:hidden fixed bottom-0 left-0 right-0 bg-white p-4 border-t border-[var(--border)] z-50">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gold w-full text-base font-bold py-4 rounded shadow disabled:opacity-50 flex justify-center items-center gap-2 h-[48px]"
                >
                  {loading ? (
                    <span className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
                  ) : (
                    'Place Order'
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="hidden lg:block w-full lg:w-2/5">
            <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm p-6 sticky top-24">
              <h2 className="text-xl font-bold font-playfair mb-6">Order Summary</h2>

              <div className="space-y-4 max-h-[40vh] overflow-y-auto no-scrollbar mb-6 border-b border-[var(--border)] pb-6 flex flex-col gap-4">
                {items.map((item) => (
                  <div key={cartItemKey(item.productId, item.size, item.color)} className="flex gap-4">
                    <div className="relative w-16 h-20 bg-gray-100 rounded overflow-hidden border shrink-0">
                      <Image src={item.image || '/placeholder.jpg'} alt={item.name} fill className="object-cover" />
                      <span className="absolute -top-1 -right-1 bg-gray-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full z-10 border border-white">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.name}</p>
                      <p className="text-xs text-[var(--text-secondary)] my-1">
                        Size: {item.size}
                        {item.color && (
                          <>
                            {' · '}
                            <span className="inline-flex items-center gap-1">
                              {item.colorHex && isValidHex(item.colorHex) && (
                                <span className="inline-block w-2.5 h-2.5 rounded-full border border-gray-300" style={{ backgroundColor: normalizeHex(item.colorHex) }} />
                              )}
                              {item.color}
                            </span>
                          </>
                        )}
                      </p>
                      <p className="font-bold text-sm">
                        {formatPrice(item.discountPrice > 0 ? item.discountPrice : item.price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 text-sm mb-6 border-b border-[var(--border)] pb-6">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Subtotal</span>
                  <span>{formatPrice(totalAmount)}</span>
                </div>
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>Shipping</span>
                  <span className="text-[var(--success)] font-bold">Free</span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-8">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-3xl">{formatPrice(totalAmount)}</span>
              </div>

              <button
                type="submit"
                form="checkout-form"
                disabled={loading}
                className="btn-gold w-full text-lg py-4 rounded shadow disabled:opacity-50 flex justify-center items-center gap-2 h-[48px]"
              >
                {loading ? (
                  <span className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
                ) : (
                  'Place Order'
                )}
              </button>

              <div className="mt-6 flex justify-center items-center gap-2 text-xs font-bold text-gray-400">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-green-500">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.573c-.199 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                ORDER VIA WHATSAPP
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
