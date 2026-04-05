'use client';

import { useState } from 'react';
import Image from 'next/image';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#FEF3C7', text: '#92400E' },
  confirmed: { bg: '#DBEAFE', text: '#1E40AF' },
  shipped: { bg: '#EDE9FE', text: '#5B21B6' },
  delivered: { bg: '#D1FAE5', text: '#065F46' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
};

function TrackerStep({ label, completed, active, failed }: { label: string, completed: boolean, active: boolean, failed?: boolean }) {
  return (
    <div className="flex flex-col md:flex-row items-center md:items-start group relative">
      <div className="flex flex-col items-center">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border-2 z-10 bg-white
          ${failed ? 'border-red-500 bg-red-50 text-red-500' : 
            completed ? 'border-[var(--gold)] bg-[var(--gold)] text-black' : 
            active ? 'border-[var(--gold)]' : 'border-gray-300'}`}
        >
          {failed ? '×' : completed ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg> : ''}
        </div>
        <div className={`w-px h-10 md:h-full md:w-full md:absolute md:top-2.5 md:left-5 md:h-px ${completed ? 'bg-[var(--gold)]' : 'bg-gray-300'} hidden md:block last-of-type:hidden`} style={{ width: 'calc(100% - 20px)' }} />
        <div className={`w-px h-10 ${completed ? 'bg-[var(--gold)]' : 'bg-gray-300'} md:hidden group-last:hidden`} />
      </div>
      <div className="mt-2 md:mt-6 md:-ml-8 md:text-center text-xs font-bold md:w-20 uppercase tracking-wider md:absolute md:left-1/2 md:-translate-x-1/2 ml-3">
        <span className={`${active || completed ? 'text-black' : 'text-gray-400'} ${failed ? 'text-red-600' : ''}`}>
          {label}
        </span>
      </div>
    </div>
  );
}

export default function OrdersClient({ theme }: { theme: string }) {
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/orders/lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: contact.trim() })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error fetching orders');
      }
      
      setOrders(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const maskPhone = (phone: string) => {
    if (!phone) return '';
    return phone.slice(0, 5) + 'XXXXX';
  };

  const maskEmail = (email: string) => {
    if (!email) return '';
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    return parts[0].slice(0, 3) + '***@' + parts[1];
  };

  const getThemeClass = (type: 'container' | 'header' | 'card' | 'input') => {
    switch (theme) {
      case 'magazine':
        if (type === 'container') return 'bg-white';
        if (type === 'header') return 'bg-black text-white px-6 py-8 uppercase tracking-[0.2em] mb-8 font-bold text-center';
        if (type === 'card') return 'border-2 border-black p-0 overflow-hidden';
        if (type === 'input') return 'border-b-2 border-black rounded-none outline-none focus:border-[var(--gold)]';
        break;
      case 'catalogue':
        if (type === 'container') return 'bg-gray-50';
        if (type === 'header') return 'bg-white px-6 py-6 border-b border-gray-200 mb-8 font-bold text-xl';
        if (type === 'card') return 'border border-gray-200 shadow-sm bg-white rounded-lg p-0';
        if (type === 'input') return 'border border-gray-300 rounded px-4 outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]';
        break;
      case 'allensolly':
      default:
        if (type === 'container') return 'bg-[#FAFAFA]';
        if (type === 'header') return 'mb-10 text-center font-playfair font-bold text-3xl';
        if (type === 'card') return 'bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-xl overflow-hidden p-0';
        if (type === 'input') return 'bg-gray-50 border border-transparent rounded-lg px-4 outline-none focus:border-gray-200 focus:bg-white transition-all';
        break;
    }
    return '';
  };

  if (orders && orders.length === 0) {
    return (
      <div className={`max-w-md mx-auto py-20 px-4 flex flex-col items-center justify-center text-center ${getThemeClass('container')}`}>
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-3xl mb-6">📭</div>
        <h2 className="text-xl font-bold mb-4 font-playfair">No orders found</h2>
        <p className="text-gray-500 mb-8 text-sm">
          We couldn't find any orders for<br/>
          <span className="font-bold text-black">{maskPhone(contact) || maskEmail(contact)}</span>
        </p>
        <p className="text-gray-500 text-sm mb-10">Make sure you entered the same contact used at checkout.</p>
        <button onClick={() => setOrders(null)} className="btn-gold w-full mb-4 font-bold tracking-widest uppercase">Go Back</button>
        <a href="https://wa.me/911234567890" target="_blank" rel="noopener noreferrer" className="w-full h-12 flex items-center justify-center gap-2 border border-green-500 text-green-600 font-bold uppercase tracking-widest text-xs rounded hover:bg-green-50 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-669-.51h-.573c-.199 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Need Help? WhatsApp Us
        </a>
      </div>
    );
  }

  if (orders && orders.length > 0) {
    const isContactEmail = contact.includes('@');
    const maskedContact = isContactEmail ? maskEmail(contact) : maskPhone(contact);

    return (
      <div className={`max-w-4xl mx-auto py-10 md:py-16 px-4 ${getThemeClass('container')}`}>
        <button onClick={() => setOrders(null)} className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase mb-8 hover:text-[var(--gold)] transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Switch Account
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold font-playfair mb-2">Your Orders</h1>
            <p className="text-gray-500 text-sm">Showing orders for <span className="font-bold text-black">{maskedContact}</span></p>
          </div>
          <div className="text-sm font-bold bg-gray-100 px-3 py-1 rounded inline-block w-max">
            {orders.length} {orders.length === 1 ? 'Order' : 'Orders'} Found
          </div>
        </div>

        <div className="space-y-6">
          {orders.map((order) => {
            const isExpanded = expandedId === order._id;
            const statusColor = STATUS_COLORS[order.orderStatus] || STATUS_COLORS.pending;
            const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            
            return (
              <div key={order._id} className={`${getThemeClass('card')}`}>
                {/* Minimal Header visible always */}
                <div 
                  className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors border-b border-transparent group"
                  onClick={() => setExpandedId(isExpanded ? null : order._id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between md:justify-start gap-4 mb-2">
                      <h3 className="font-bold text-base md:text-lg">ORDER #{order._id.slice(-6).toUpperCase()}</h3>
                      <span 
                        className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded"
                        style={{ backgroundColor: statusColor.bg, color: statusColor.text }}
                      >
                        {order.orderStatus}
                      </span>
                    </div>
                    <p className="text-gray-500 text-sm mb-4">{dateStr}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {order.items.slice(0, 3).map((item: any, idx: number) => (
                            <div key={idx} className="w-10 h-10 rounded overflow-hidden border-2 border-white bg-gray-100 relative shadow-sm">
                              {item.image ? (
                                <Image src={item.image} alt={item.name} fill className="object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">Pic</div>
                              )}
                            </div>
                          ))}
                          {order.items.length > 3 && (
                            <div className="w-10 h-10 rounded border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 shadow-sm z-10 relative">
                              +{order.items.length - 3}
                            </div>
                          )}
                        </div>
                        <span className="text-sm font-bold ml-2">
                          {order.items.length} {order.items.length === 1 ? 'item' : 'items'} · ₹{order.totalAmount}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-[var(--gold)] text-xs font-bold tracking-widest uppercase md:hidden">
                        VIEW <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-2 text-[var(--gold)] text-xs font-bold tracking-widest uppercase ml-8 hover-underline">
                    VIEW DETAILS <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-5 md:p-8 animate-fade-in flex flex-col md:flex-row gap-8 md:gap-12">
                    
                    {/* Left Column (Tracker & Summary) */}
                    <div className="flex-1 p-0">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-6">Status Tracker</h4>
                      
                      <div className="flex md:flex-row md:justify-between flex-col gap-6 md:gap-0 relative mb-12 ml-2 md:ml-0">
                         {order.orderStatus === 'cancelled' ? (
                           <>
                             <TrackerStep label="Order Placed" completed={true} active={false} />
                             <TrackerStep label="Cancelled" completed={false} active={false} failed={true} />
                           </>
                         ) : (
                           <>
                              <TrackerStep label="Order Placed" completed={true} active={order.orderStatus === 'pending'} />
                              <TrackerStep label="Confirmed" completed={['confirmed', 'shipped', 'delivered'].includes(order.orderStatus)} active={order.orderStatus === 'confirmed'} />
                              <TrackerStep label="Shipped" completed={['shipped', 'delivered'].includes(order.orderStatus)} active={order.orderStatus === 'shipped'} />
                              <TrackerStep label="Delivered" completed={order.orderStatus === 'delivered'} active={order.orderStatus === 'delivered'} />
                           </>
                         )}
                      </div>

                      <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 border-t border-gray-200 pt-8">Payment Summary</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-medium">₹{order.totalAmount}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Delivery</span><span className="text-green-600 font-bold uppercase">Free</span></div>
                        <div className="flex justify-between pt-3 border-t border-gray-200 font-bold text-base text-black">
                          <span>Total</span><span>₹{order.totalAmount}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 mt-2">
                           Paid via Razorpay <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500"><polyline points="20 6 9 17 4 12"/></svg>
                        </div>
                      </div>
                    </div>

                    {/* Right Column (Items & Address & Contact) */}
                    <div className="md:w-72 shrink-0 space-y-8 border-t md:border-t-0 md:border-l border-gray-200 pt-8 md:pt-0 md:pl-8">
                       <div>
                         <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Items Ordered</h4>
                         <div className="space-y-4">
                           {order.items.map((item: any, idx: number) => (
                             <div key={idx} className="flex gap-3">
                               <div className="w-12 h-16 bg-gray-100 rounded overflow-hidden relative shrink-0 border border-gray-200">
                                 {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                               </div>
                               <div>
                                 <h5 className="font-semibold text-sm line-clamp-1">{item.name}</h5>
                                 <p className="text-xs text-gray-500 mt-1">Size: {item.size} · Qty: {item.quantity}</p>
                                 <p className="font-bold text-sm mt-1">₹{item.price}</p>
                               </div>
                             </div>
                           ))}
                         </div>
                       </div>

                       <div>
                         <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Delivery Details</h4>
                         <div className="text-sm space-y-1 bg-white p-4 rounded border border-gray-200">
                           <p className="font-bold">{order.customer.name}</p>
                           <p className="text-gray-600">{order.customer.address?.line1}</p>
                           <p className="text-gray-600">{order.customer.address?.city}, {order.customer.address?.state}</p>
                           <p className="text-gray-600">{order.customer.address?.pincode}</p>
                         </div>
                       </div>

                       <a href="https://wa.me/911234567890" target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center gap-2 bg-green-500 text-white font-bold uppercase tracking-widest text-xs h-12 rounded hover:bg-green-600 transition-colors shadow-sm">
                         <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-669-.51h-.573c-.199 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                         WhatsApp Support
                       </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-[80vh] flex items-center justify-center py-12 px-4 ${getThemeClass('container')}`}>
      <div className={`w-full max-w-md ${getThemeClass('card')} p-8 md:p-10 text-center relative z-10 bg-white`}>
        <div className="w-16 h-16 bg-[var(--gold)]/10 text-[var(--gold)] rounded-full flex items-center justify-center mx-auto mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <h1 className={`${theme === 'magazine' ? 'font-bold uppercase tracking-[0.2em] mb-4' : 'font-playfair text-2xl font-bold mb-4'}`}>
          My Orders
        </h1>
        <p className="text-sm text-gray-500 mb-8 uppercase tracking-widest font-bold">
          Enter your phone or email<br/>to access your orders
        </p>

        <form onSubmit={handleLookup} className="space-y-6 text-left">
          {error && <div className="bg-red-50 text-red-500 p-3 rounded text-sm text-center font-bold">{error}</div>}
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Contact Info</label>
            <input 
              type="text" 
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="9876543210 or email@domain.com"
              className={`w-full h-12 text-sm ${getThemeClass('input')}`}
              required
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full h-12 flex items-center justify-center font-bold tracking-widest uppercase transition-all
              ${theme === 'magazine' ? 'bg-black text-[var(--gold)] hover:bg-gray-900 border-2 border-black' : 'btn-gold'}`}
          >
            {loading ? <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin"/> : 'View My Orders'}
          </button>
        </form>

      </div>
    </div>
  );
}
