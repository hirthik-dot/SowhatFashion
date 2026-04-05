import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { getOrderById } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  let order = null;
  
  try {
    order = await getOrderById(resolvedParams.id);
  } catch (error) {
    console.error('Failed to load order:', error);
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--surface)]">
        <Navbar />
        <main className="flex-grow flex items-center justify-center p-4">
          <div className="text-center bg-white p-8 rounded-xl shadow-sm border border-[var(--border)]">
            <h1 className="text-2xl font-bold font-playfair mb-4">Order Not Found</h1>
            <p className="text-[var(--text-secondary)] mb-6">We couldn't find the order details. If your payment was deducted, please contact support.</p>
            <Link href="/" className="btn-gold-outline rounded">Return Home</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface)]">
      <Navbar variant="minimal" />

      <main className="flex-grow max-w-4xl mx-auto px-4 py-16 w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
          
          {/* Header Success */}
          <div className="bg-[var(--success)] text-white p-10 text-center">
            <div className="w-20 h-20 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h1 className="text-4xl font-playfair font-bold mb-2">Order Confirmed!</h1>
            <p className="opacity-90 text-lg">Thank you for shopping with So What Menswear.</p>
          </div>

          <div className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 pb-6 border-b border-[var(--border)] gap-4">
              <div>
                <p className="text-[var(--text-secondary)] text-sm uppercase tracking-widest font-bold mb-1">Order ID</p>
                <p className="font-mono text-lg font-bold">{order._id}</p>
              </div>
              <div className="md:text-right">
                <p className="text-[var(--text-secondary)] text-sm uppercase tracking-widest font-bold mb-1">Expected Delivery</p>
                <p className="text-lg font-bold text-[var(--gold-hover)]">3-5 Business Days</p>
              </div>
            </div>

            {/* Items */}
            <div className="mb-10">
              <h2 className="text-xl font-bold font-playfair mb-6">Items Ordered</h2>
              <div className="space-y-4">
                {order.items?.map((item: any) => (
                  <div key={item._id} className="flex gap-4 items-center border border-[var(--border)] p-4 rounded-lg bg-gray-50/50">
                    <div className="relative w-16 h-20 bg-gray-100 rounded overflow-hidden shrink-0">
                      <Image src={item.image || '/placeholder.jpg'} alt={item.name} fill className="object-cover" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-base">{item.name}</p>
                      <p className="text-sm text-[var(--text-secondary)] mt-1">Size: {item.size} | Qty: {item.quantity}</p>
                    </div>
                    <div className="font-bold text-lg">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Shipping Details */}
              <div>
                <h2 className="text-xl font-bold font-playfair mb-4 flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 17h4V5H2v12h3m15-4v4h-3m3-4l-4-4h-3M4 17a2 2 0 100 4 2 2 0 000-4zM19 17a2 2 0 100 4 2 2 0 000-4z"/></svg> Shipping Address
                </h2>
                <div className="text-[var(--text-secondary)] bg-gray-50 p-5 rounded-lg border border-[var(--border)] leading-tight">
                  <p className="font-bold text-[var(--text-primary)] mb-2 text-base">{order.customer?.name}</p>
                  <p>{order.customer?.address?.line1}</p>
                  <p>{order.customer?.address?.city}, {order.customer?.address?.state}</p>
                  <p>PIN: {order.customer?.address?.pincode}</p>
                  <p className="mt-4 pt-4 border-t border-[var(--border)] font-semibold">Ph: {order.customer?.phone}</p>
                  <p className="font-semibold text-sm">{order.customer?.email}</p>
                </div>
              </div>

              {/* Payment Summary */}
              <div>
                <h2 className="text-xl font-bold font-playfair mb-4 flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> Payment Summary
                </h2>
                <div className="bg-gray-50 p-5 rounded-lg border border-[var(--border)]">
                  <div className="space-y-3 text-sm border-b border-[var(--border)] pb-4 mb-4 text-[var(--text-secondary)]">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="font-bold text-[var(--text-primary)]">{formatPrice(order.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span className="text-[var(--success)] font-bold">Free</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-lg">
                    <span className="font-bold font-playfair">Total Paid</span>
                    <span className="font-bold">{formatPrice(order.totalAmount)}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-[var(--border)] flex justify-between items-center text-xs">
                    <span className="uppercase font-bold text-[var(--text-secondary)] tracking-widest">Payment Status</span>
                    <span className="bg-[var(--success)] text-white px-2 py-0.5 rounded font-bold uppercase">{order.paymentStatus}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center pt-8 border-t border-[var(--border)]">
              <Link href="/products">
                <button className="btn-gold rounded px-10 py-3 text-base shadow hover:shadow-lg">CONTINUE SHOPPING</button>
              </Link>
            </div>

          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
