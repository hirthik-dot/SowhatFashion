'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice, getOrderStatusLabel } from '@/lib/utils';
import { confirmOrder } from '@/lib/api';
import { buildWhatsAppOrderLink } from '@/lib/whatsapp';

interface OrderConfirmationClientProps {
  order: any;
}

export default function OrderConfirmationClient({ order: initialOrder }: OrderConfirmationClientProps) {
  const [order, setOrder] = useState(initialOrder);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const isConfirmed = order.orderStatus === 'confirmed';
  const isPending = order.orderStatus === 'pending';

  const address = [
    order.customer?.address?.line1,
    order.customer?.address?.city,
    order.customer?.address?.state,
    order.customer?.address?.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  const handleConfirm = async () => {
    setConfirming(true);
    setError('');
    try {
      const updated = await confirmOrder(order._id);
      setOrder(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to confirm order. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const url = buildWhatsAppOrderLink({
      customerName: order.customer?.name || '',
      items: (order.items || []).map((item: any) => ({
        name: item.name,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount: order.totalAmount,
      address,
    });
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[var(--border)] overflow-hidden">
      {isConfirmed ? (
        <div className="bg-[var(--success)] text-white p-10 text-center">
          <div className="w-20 h-20 rounded-full bg-white/20 mx-auto flex items-center justify-center mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-4xl font-playfair font-bold mb-2">🎉 Order Placed Successfully!</h1>
          <p className="opacity-90 text-lg">Thank you for shopping with So What Menswear.</p>
        </div>
      ) : (
        <div className="bg-[#FEF3C7] text-[#92400E] p-10 text-center">
          <div className="w-20 h-20 rounded-full bg-white/40 mx-auto flex items-center justify-center mb-6 text-3xl">
            📱
          </div>
          <h1 className="text-3xl font-playfair font-bold mb-2">Complete Your Order</h1>
          <p className="opacity-90 text-base max-w-lg mx-auto">
            We opened WhatsApp with your order details. Send the message to us, then click the button below to confirm.
          </p>
        </div>
      )}

      <div className="p-8 md:p-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 pb-6 border-b border-[var(--border)] gap-4">
          <div>
            <p className="text-[var(--text-secondary)] text-sm uppercase tracking-widest font-bold mb-1">Order ID</p>
            <p className="font-mono text-lg font-bold">{order._id}</p>
          </div>
          <div className="md:text-right">
            <p className="text-[var(--text-secondary)] text-sm uppercase tracking-widest font-bold mb-1">Status</p>
            <span
              className={`inline-block text-sm font-bold uppercase tracking-wider px-3 py-1 rounded ${
                isConfirmed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {getOrderStatusLabel(order.orderStatus)}
            </span>
          </div>
        </div>

        <div className="mb-10">
          <h2 className="text-xl font-bold font-playfair mb-6">Order Summary</h2>
          <div className="space-y-4">
            {order.items?.map((item: any) => (
              <div
                key={item._id || `${item.name}-${item.size}`}
                className="flex gap-4 items-center border border-[var(--border)] p-4 rounded-lg bg-gray-50/50"
              >
                <div className="relative w-16 h-20 bg-gray-100 rounded overflow-hidden shrink-0">
                  <Image src={item.image || '/placeholder.jpg'} alt={item.name} fill className="object-cover" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-base">{item.name}</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Size: {item.size} | Qty: {item.quantity}
                  </p>
                </div>
                <div className="font-bold text-lg">{formatPrice(item.price * item.quantity)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-xl font-bold font-playfair mb-4 flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 17h4V5H2v12h3m15-4v4h-3m3-4l-4-4h-3M4 17a2 2 0 100 4 2 2 0 000-4zM19 17a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              Shipping Address
            </h2>
            <div className="text-[var(--text-secondary)] bg-gray-50 p-5 rounded-lg border border-[var(--border)] leading-tight">
              <p className="font-bold text-[var(--text-primary)] mb-2 text-base">{order.customer?.name}</p>
              <p>{order.customer?.address?.line1}</p>
              <p>
                {order.customer?.address?.city}, {order.customer?.address?.state}
              </p>
              <p>PIN: {order.customer?.address?.pincode}</p>
              <p className="mt-4 pt-4 border-t border-[var(--border)] font-semibold">Ph: {order.customer?.phone}</p>
              <p className="font-semibold text-sm">{order.customer?.email}</p>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold font-playfair mb-4 flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              Order Total
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
                <span className="font-bold font-playfair">Total</span>
                <span className="font-bold">{formatPrice(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>

        {isPending && (
          <div className="mt-12 pt-8 border-t border-[var(--border)] space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-sm text-center font-bold">{error}</div>
            )}
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="w-full flex items-center justify-center gap-2 bg-green-500 text-white font-bold py-4 rounded shadow hover:bg-green-600 transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.573c-.199 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Open WhatsApp Again
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={confirming}
              className="btn-gold w-full text-lg py-4 rounded shadow disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {confirming ? (
                <span className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
              ) : (
                "✅ I've Sent the Message"
              )}
            </button>
          </div>
        )}

        {isConfirmed && (
          <div className="mt-12 text-center pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/orders">
              <button className="btn-gold-outline rounded px-10 py-3 text-base">View My Orders</button>
            </Link>
            <Link href="/products">
              <button className="btn-gold rounded px-10 py-3 text-base shadow hover:shadow-lg">Continue Shopping</button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
