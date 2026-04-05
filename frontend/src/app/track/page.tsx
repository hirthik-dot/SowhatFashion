'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    
    setLoading(true);
    // Usually we would verify here, but we can just redirect to the order page
    // The order page handles the "Order Not Found" state gracefully.
    router.push(`/order/${orderId.trim()}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface)]">
      <Navbar variant="default" />
      
      <main className="flex-grow flex items-center justify-center p-4 py-20">
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-[var(--border)] max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-[#F9F6F0] rounded-full mx-auto flex items-center justify-center mb-6 text-[var(--gold)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <h1 className="text-3xl font-playfair font-bold mb-4 uppercase tracking-wider">Track Order</h1>
          <p className="text-[var(--text-secondary)] mb-8">
            Enter your Order ID below to check the current status of your shipment.
          </p>
          
          <form onSubmit={handleTrack} className="flex flex-col gap-4">
            <div>
              <input 
                type="text" 
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. 64b9f872e4..."
                className="w-full border border-[var(--border)] rounded px-4 h-[54px] text-center font-mono outline-none focus:border-[var(--gold)] transition-colors"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading || !orderId.trim()}
              className="btn-gold w-full h-[54px] flex items-center justify-center rounded font-bold tracking-widest text-sm shadow hover:shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
              ) : (
                'TRACK ORDER'
              )}
            </button>
          </form>
          
          <p className="text-xs text-[var(--text-secondary)] mt-8">
            Having trouble? <a href="/contact" className="underline hover:text-black">Contact Support</a>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
