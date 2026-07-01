'use client';

import { useState } from 'react';
import { requestCancelOrder } from '@/lib/api';
import { buildWhatsAppCancelLink } from '@/lib/whatsapp';
import { STORE_ORDER_TERMS } from '@/lib/order-terms';

interface CancelOrderFlowProps {
  order: {
    _id: string;
    orderStatus: string;
    paymentStatus?: string;
    totalAmount: number;
    customer?: { name?: string };
    items?: Array<{
      name: string;
      size: string;
      color?: string;
      quantity: number;
      price: number;
    }>;
  };
  onOrderUpdated?: (order: any) => void;
  className?: string;
}

const CANCELLABLE_STATUSES = ['pending', 'confirmed', 'shipped'];

export function canCancelOrder(orderStatus: string): boolean {
  return CANCELLABLE_STATUSES.includes(orderStatus);
}

export default function CancelOrderFlow({ order, onOrderUpdated, className = '' }: CancelOrderFlowProps) {
  const [showTerms, setShowTerms] = useState(false);
  const [whatsappOpened, setWhatsappOpened] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (order.orderStatus === 'cancel_requested') {
    return (
      <div className={`rounded-lg border border-orange-200 bg-orange-50 p-4 ${className}`}>
        <p className="text-sm font-bold text-orange-800 uppercase tracking-wider">Cancel Request Submitted</p>
        <p className="text-sm text-orange-700 mt-1">
          We received your cancellation request. It will be reviewed shortly.
          {order.paymentStatus === 'refund_requested' && ' Your refund will be processed upon approval.'}
        </p>
      </div>
    );
  }

  if (order.orderStatus === 'cancelled') {
    return null;
  }

  if (!canCancelOrder(order.orderStatus)) {
    return null;
  }

  const openWhatsApp = () => {
    const url = buildWhatsAppCancelLink({
      orderId: order._id,
      customerName: order.customer?.name || '',
      items: (order.items || []).map((item) => ({
        name: item.name,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount: order.totalAmount,
    });
    window.open(url, '_blank');
    setWhatsappOpened(true);
    setShowTerms(false);
  };

  const handleConfirmCancel = async () => {
    setSubmitting(true);
    setError('');
    try {
      const updated = await requestCancelOrder(order._id);
      onOrderUpdated?.(updated);
      setWhatsappOpened(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit cancel request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={className} onClick={(e) => e.stopPropagation()}>
      {!whatsappOpened ? (
        <button
          type="button"
          onClick={() => setShowTerms(true)}
          className="w-full flex items-center justify-center gap-2 border border-red-300 text-red-700 font-bold uppercase tracking-widest text-xs h-11 rounded hover:bg-red-50 transition-colors"
        >
          Cancel Order
        </button>
      ) : (
        <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm text-orange-800">
            WhatsApp should have opened with your cancel request. Send the message, then confirm below.
          </p>
          <button
            type="button"
            onClick={handleConfirmCancel}
            disabled={submitting}
            className="w-full h-11 bg-red-600 text-white font-bold uppercase tracking-widest text-xs rounded hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : "I've Sent the Cancel Request"}
          </button>
          <button
            type="button"
            onClick={openWhatsApp}
            className="w-full h-10 border border-orange-300 text-orange-800 font-bold uppercase tracking-widest text-xs rounded hover:bg-orange-100 transition-colors"
          >
            Open WhatsApp Again
          </button>
        </div>
      )}

      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}

      {showTerms && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold font-playfair">Cancel Order</h3>
              <p className="text-sm text-gray-500 mt-1">Please read our store policies before proceeding.</p>
            </div>
            <div className="p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Terms & Conditions</p>
              <ul className="space-y-2 text-sm text-gray-700">
                {STORE_ORDER_TERMS.map((term) => (
                  <li key={term} className="flex gap-2">
                    <span className="text-red-500 shrink-0">*</span>
                    <span>{term}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-gray-600 mt-4">
                By continuing, you will send a cancellation request via WhatsApp. Your order status will show as
                &quot;Cancel Request&quot; until we approve it.
                {order.paymentStatus === 'paid' && ' If approved, your payment refund will be processed.'}
              </p>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                type="button"
                onClick={() => setShowTerms(false)}
                className="flex-1 h-11 border border-gray-300 rounded font-bold uppercase tracking-widest text-xs hover:bg-gray-50"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={openWhatsApp}
                className="flex-1 h-11 bg-red-600 text-white rounded font-bold uppercase tracking-widest text-xs hover:bg-red-700"
              >
                Continue to WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
