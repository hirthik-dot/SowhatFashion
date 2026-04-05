'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { getOrdersByCustomer } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';

export default function MyOrdersPage() {
  const [credentials, setCredentials] = useState({ email: '', phone: '' });
  const [isLogged, setIsLogged] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Check valid stored credentials on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('sowaat_customer_email');
    const savedPhone = localStorage.getItem('sowaat_customer_phone');
    if (savedEmail && savedPhone) {
      setCredentials({ email: savedEmail, phone: savedPhone });
      setIsLogged(true);
      fetchOrders(savedEmail, savedPhone);
    }
  }, []);

  const fetchOrders = async (email: string, phone: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await getOrdersByCustomer(email, phone);
      setOrders(data);
    } catch (err) {
      setError('Could not verify your details or fetch orders.');
      logout();
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!credentials.email.trim() || !credentials.phone.trim()) return;
    
    // Attempt to fetch orders validating login
    await fetchOrders(credentials.email.trim(), credentials.phone.trim());
    
    // Save to local storage
    localStorage.setItem('sowaat_customer_email', credentials.email.trim());
    localStorage.setItem('sowaat_customer_phone', credentials.phone.trim());
    setIsLogged(true);
  };

  const logout = () => {
    localStorage.removeItem('sowaat_customer_email');
    localStorage.removeItem('sowaat_customer_phone');
    setIsLogged(false);
    setOrders([]);
    setCredentials({ email: '', phone: '' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface)]">
      <Navbar variant="default" />
      
      <main className="flex-grow max-w-5xl mx-auto px-4 py-12 md:py-20 w-full">
        {!isLogged ? (
          // LOGIN FORM
          <div className="max-w-md mx-auto bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-[var(--border)] text-center">
            <h1 className="text-3xl font-playfair font-bold mb-2">My Orders</h1>
            <p className="text-[var(--text-secondary)] text-sm mb-8">
              Enter the Email and Phone matching your previous purchases to view your order history.
            </p>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="text-left space-y-1">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Email Address</label>
                <input 
                  type="email" 
                  value={credentials.email}
                  onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                  className="w-full border border-[var(--border)] rounded px-4 h-12 focus:border-[var(--gold)] outline-none"
                  required
                />
              </div>
              <div className="text-left space-y-1 mb-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Phone Number</label>
                <input 
                  type="tel" 
                  value={credentials.phone}
                  onChange={(e) => setCredentials({...credentials, phone: e.target.value})}
                  className="w-full border border-[var(--border)] rounded px-4 h-12 focus:border-[var(--gold)] outline-none"
                  required
                />
              </div>

              {error && <p className="text-sm font-bold text-red-500 bg-red-50 py-2 rounded">{error}</p>}

              <button 
                type="submit" 
                disabled={loading}
                className="btn-gold w-full h-12 rounded mt-2 shadow hover:shadow-lg disabled:opacity-50"
              >
                {loading ? 'VERIFYING...' : 'VIEW MY ORDERS'}
              </button>
            </form>
          </div>
        ) : (
          // ORDERS LIST
          <div>
            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[var(--border)] pb-6 mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-playfair font-bold mb-1">Your Orders</h1>
                <p className="text-[var(--text-secondary)]">Hi, {credentials.email}</p>
              </div>
              <button onClick={logout} className="text-sm font-bold text-[var(--text-secondary)] underline hover:text-black">
                Not you? Log out
              </button>
            </div>

            {loading ? (
              <div className="text-center py-20">Loading your orders...</div>
            ) : orders.length === 0 ? (
              <div className="text-center bg-white p-12 rounded-xl border border-[var(--border)]">
                <h2 className="text-2xl font-playfair mb-4">No orders found</h2>
                <p className="text-[var(--text-secondary)] mb-8">We couldn't find any orders matching this email and phone.</p>
                <Link href="/products" className="btn-gold rounded px-8">START SHOPPING</Link>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <div key={order._id} className="bg-white border border-[var(--border)] rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row">
                    
                    {/* Header info */}
                    <div className="bg-gray-50 border-r border-[var(--border)] p-6 md:w-1/4 flex flex-col justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">ORDER NUMBER</p>
                        <p className="font-mono text-sm break-all font-bold mb-4">{order._id}</p>
                        <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">DATE PLACED</p>
                        <p className="text-sm font-bold mb-4">{new Date(order.createdAt).toLocaleDateString()}</p>
                        <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1">TOTAL</p>
                        <p className="text-lg font-bold text-[var(--gold)] mb-4">{formatPrice(order.totalAmount)}</p>
                      </div>
                      <Link href={`/order/${order._id}`} className="btn-gold-outline text-xs px-4 py-2 w-full text-center">
                        View Receipt
                      </Link>
                    </div>

                    {/* Status & Items */}
                    <div className="p-6 flex-1">
                      <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[var(--border)]">
                        <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${
                          order.orderStatus === 'delivered' ? 'bg-green-100 text-green-700' :
                          order.orderStatus === 'cancelled' ? 'bg-red-100 text-red-700' :
                          order.orderStatus === 'shipped' ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {order.orderStatus}
                        </span>
                        <span className="text-sm text-[var(--text-secondary)] font-medium">
                          {order.orderStatus === 'delivered' ? 'Package has been delivered' : 'Expected delivery in 3-5 days'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {order.items?.map((item: any) => (
                          <div key={item._id} className="flex gap-4">
                            <div className="w-16 h-20 bg-gray-100 rounded border border-[var(--border)] relative overflow-hidden shrink-0">
                               <img src={item.image || '/placeholder.jpg'} alt={item.name} className="w-full h-full object-cover" />
                               <span className="absolute -top-1 -right-1 bg-black text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full z-10 border border-white">
                                {item.quantity}
                              </span>
                            </div>
                            <div>
                               <Link href={`/products/${item.product || ''}`} className="font-semibold text-sm hover:text-[var(--gold)] leading-tight block mb-1">
                                {item.name}
                               </Link>
                               <p className="text-xs text-[var(--text-secondary)]">Size: <span className="font-bold text-black">{item.size}</span></p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
