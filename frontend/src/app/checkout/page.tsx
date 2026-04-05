'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/utils';
import { useAuthStore } from '@/lib/auth-store';
import { createOrder, createPaymentOrder, verifyPayment } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import Image from 'next/image';

// Declare Razorpay on window
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const { items, totalAmount, clearCart } = useCart();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    line1: '',
    city: '',
    state: '',
    pincode: '',
  });

  const { user, isLoggedIn, openAuthModal } = useAuthStore();

  useEffect(() => {
    setMounted(true);
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (user && formData.name === '') {
       setFormData(prev => ({
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

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setLoading(true);
    try {
      // 1. Create Razorpay order on backend
      const rzpOrder = await createPaymentOrder(totalAmount);

      // 2. Prepare Order Data
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
        items: items.map(item => ({
          product: item.productId,
          name: item.name,
          image: item.image,
          size: item.size,
          quantity: item.quantity,
          price: item.discountPrice > 0 ? item.discountPrice : item.price
        })),
        totalAmount,
      };

      // 3. Open Razorpay Checkout Modal
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: 'So What Menswear',
        description: 'Order Payment',
        order_id: rzpOrder.orderId,
        handler: async function (response: any) {
          // 4. Verify payment on backend and create order
          try {
            const verificationData = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              orderData
            };
            
            const result = await verifyPayment(verificationData);
            
            if (result.order) {
              // Optionally save new address if user is logged in
              if (isLoggedIn) {
                const isNewAddress = !user?.savedAddresses?.some((a: any) => a.line1 === formData.line1 && a.pincode === formData.pincode);
                if (isNewAddress) {
                  try {
                    await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/users/addresses`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        label: 'Home',
                        line1: formData.line1,
                        city: formData.city,
                        state: formData.state,
                        pincode: formData.pincode,
                        isDefault: true
                      })
                    });
                  } catch(e) {}
                }
              }
            
              clearCart();
              router.push(`/order/${result.order._id}`);
            }
          } catch (error) {
            console.error('Payment verification failed:', error);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: '#C9A84C', // var(--gold)
        },
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response: any) {
        console.error('Payment failed:', response.error);
        alert('Payment failed. Please try again.');
        setLoading(false);
      });
      rzp1.open();

    } catch (error) {
      console.error('Error initiating payment:', error);
      alert('Error initiating payment. Please try again later.');
      setLoading(false);
    }
  };

  if (!mounted) return null;

  if (items.length === 0) {
    router.push('/cart');
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <Navbar variant="minimal" />

      <main className="max-w-7xl mx-auto px-4 py-8 md:py-24">
        <div className="flex flex-col lg:flex-row gap-6 md:gap-10">
          
          {/* Mobile Order Summary Accordion */}
          <div className="lg:hidden bg-white border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
            <button 
              onClick={() => setSummaryOpen(!summaryOpen)}
              className="w-full flex justify-between items-center p-4 bg-gray-50 font-bold"
            >
              <span className="flex items-center gap-2 text-[var(--gold)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                {summaryOpen ? 'Hide' : 'Show'} Order Summary
              </span>
              <span>{formatPrice(totalAmount)}</span>
            </button>
            <div className={`${summaryOpen ? 'block' : 'hidden'} p-4 border-t border-[var(--border)]`}>
              <div className="flex flex-col gap-4 mb-4">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.size}`} className="flex gap-4">
                    <div className="relative w-16 h-20 bg-gray-100 rounded overflow-hidden border shrink-0">
                      <Image src={item.image || '/placeholder.jpg'} alt={item.name} fill className="object-cover" />
                      <span className="absolute -top-1 -right-1 bg-gray-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full z-10 border border-white">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.name}</p>
                      <p className="text-xs text-[var(--text-secondary)] my-1">Size: {item.size}</p>
                      <p className="font-bold text-sm">{formatPrice(item.discountPrice > 0 ? item.discountPrice : item.price)}</p>
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

          {/* Left: Form */}
          <div className="w-full lg:w-3/5 pb-24 md:pb-0">
            <h1 className="text-3xl font-playfair font-bold mb-6 md:mb-8 hidden md:block">Checkout</h1>
            
            <form id="checkout-form" onSubmit={handlePayment} className="space-y-8 bg-white p-4 md:p-8 rounded-xl border border-[var(--border)] shadow-sm">
              <section>
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                  <h2 className="text-xl font-bold font-playfair flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-sans">1</span> Contact Information
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
                    <input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full h-[48px] border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Email Address</label>
                    <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full h-[48px] border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Phone Number</label>
                    <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full h-[48px] border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]" />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-xl font-bold font-playfair mb-4 flex items-center gap-2 border-b pb-2 mt-8">
                  <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-sans">2</span> Shipping Address
                </h2>
                
                {isLoggedIn && user?.savedAddresses && user.savedAddresses.length > 0 && (
                  <div className="mb-6 space-y-3">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block">Select Saved Address</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {user.savedAddresses.map((addr: any, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setFormData(prev => ({ ...prev, line1: addr.line1, city: addr.city, state: addr.state, pincode: addr.pincode }))}
                          className={`p-3 rounded-lg border cursor-pointer hover:border-[var(--gold)] transition-colors ${formData.line1 === addr.line1 && formData.pincode === addr.pincode ? 'border-[var(--gold)] bg-[var(--gold)]/5' : 'border-[var(--border)] bg-gray-50'}`}
                        >
                          <div className="font-bold text-sm flex justify-between">
                            <span>🏠 {addr.label} {addr.isDefault && '(Default)'}</span>
                            {formData.line1 === addr.line1 && formData.pincode === addr.pincode && <span className="text-[var(--gold)]">✓</span>}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">{addr.line1}</div>
                          <div className="text-xs text-gray-600">{addr.city}, {addr.state} {addr.pincode}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Address Line 1</label>
                    <input required type="text" name="line1" value={formData.line1} onChange={handleChange} className="w-full h-[48px] border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]" placeholder="House/Flat No., Street Name" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">City</label>
                    <input required type="text" name="city" value={formData.city} onChange={handleChange} className="w-full h-[48px] border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">State</label>
                    <input required type="text" name="state" value={formData.state} onChange={handleChange} className="w-full h-[48px] border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Pincode</label>
                    <input required pattern="[0-9]*" inputMode="numeric" type="number" name="pincode" value={formData.pincode} onChange={handleChange} className="w-full h-[48px] border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]" />
                  </div>
                </div>
              </section>
              
              {/* Pay Button inside form for mobile to act as explicit submit */}
              <div className="pt-4 lg:hidden fixed bottom-0 left-0 right-0 bg-white p-4 border-t border-[var(--border)] z-50">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="btn-gold w-full text-base font-bold py-4 rounded shadow disabled:opacity-50 flex justify-center items-center gap-2 h-[48px]"
                >
                  {loading ? (
                    <span className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full"></span>
                  ) : (
                    `PAY ${formatPrice(totalAmount)}`
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Right: Order Summary Sidebar (Desktop Only) */}
          <div className="hidden lg:block w-full lg:w-2/5">
            <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm p-6 sticky top-24">
              <h2 className="text-xl font-bold font-playfair mb-6">Order Summary</h2>
              
              <div className="space-y-4 max-h-[40vh] overflow-y-auto no-scrollbar mb-6 border-b border-[var(--border)] pb-6 flex flex-col gap-4">
                {items.map((item) => (
                  <div key={`${item.productId}-${item.size}`} className="flex gap-4">
                    <div className="relative w-16 h-20 bg-gray-100 rounded overflow-hidden border shrink-0">
                      <Image src={item.image || '/placeholder.jpg'} alt={item.name} fill className="object-cover" />
                      <span className="absolute -top-1 -right-1 bg-gray-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full z-10 border border-white">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.name}</p>
                      <p className="text-xs text-[var(--text-secondary)] my-1">Size: {item.size}</p>
                      <p className="font-bold text-sm">{formatPrice(item.discountPrice > 0 ? item.discountPrice : item.price)}</p>
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
                  <span className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full"></span>
                ) : (
                  `PAY ${formatPrice(totalAmount)}`
                )}
              </button>

              <div className="mt-6 flex justify-center items-center gap-2 text-xs font-bold text-gray-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
                RAZORPAY SECURE
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
