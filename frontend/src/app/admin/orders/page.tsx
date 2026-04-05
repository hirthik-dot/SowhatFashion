'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { adminGetOrders, adminUpdateOrderStatus } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import Image from 'next/image';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await adminGetOrders(1, 50); // Just getting 50 for simplicity in demo
      setOrders(res.orders || []);
    } catch (error) {
      console.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusUpdate = async (status: string) => {
    if (!selectedOrder) return;
    setStatusUpdateLoading(true);
    try {
      await adminUpdateOrderStatus(selectedOrder._id, status);
      setSelectedOrder({ ...selectedOrder, orderStatus: status });
      fetchOrders();
    } catch (error) {
      alert('Failed to update status');
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  return (
    <div>
      <AdminHeader title="Order Management" />
      
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-secondary)]">
              <tr>
                <th className="px-6 py-4 font-semibold">Order ID</th>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Items</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Payment</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center">Loading orders...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-[var(--text-secondary)]">No orders found.</td></tr>
              ) : orders.map((order) => (
                <tr 
                  key={order._id} 
                  onClick={() => setSelectedOrder(order)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <td className="px-6 py-4 font-mono font-medium text-[var(--gold-hover)] hover:underline">
                    #{order._id.substring(order._id.length - 8)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-semibold text-black">{order.customer.name}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{order.customer.email}</div>
                  </td>
                  <td className="px-6 py-4 font-medium">{order.items?.length || 0} items</td>
                  <td className="px-6 py-4 font-semibold">{formatPrice(order.totalAmount)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${order.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      order.orderStatus === 'pending' ? 'bg-orange-100 text-orange-700' :
                      order.orderStatus === 'delivered' ? 'bg-green-100 text-green-700' :
                      order.orderStatus === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {order.orderStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold font-playfair mb-1">Order Details</h2>
                <p className="text-sm font-mono text-[var(--text-secondary)]">#{selectedOrder._id}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-gray-500 hover:text-black p-2 bg-gray-200 rounded-full">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-grow flex flex-col md:flex-row gap-8">
              
              <div className="w-full md:w-2/3">
                <h3 className="font-bold uppercase tracking-widest text-xs mb-4 text-[var(--text-secondary)]">Items Ordered</h3>
                <div className="border border-[var(--border)] rounded-lg divide-y divide-[var(--border)] bg-gray-50 mb-8">
                  {selectedOrder.items?.map((item: any, i: number) => (
                    <div key={i} className="p-4 flex items-center gap-4">
                      <div className="w-16 h-20 relative rounded border border-[var(--border)] overflow-hidden bg-white shrink-0">
                        <Image src={item.image || '/placeholder.jpg'} alt={item.name} fill className="object-cover" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{item.name}</h4>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">Size: {item.size} | Qty: {item.quantity}</p>
                      </div>
                      <div className="font-bold text-sm">
                        {formatPrice(item.price * item.quantity)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-orange-50 border border-orange-100 rounded-lg p-5">
                  <h3 className="font-bold uppercase tracking-widest text-xs mb-3 text-orange-800">Update Order Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].map(status => (
                      <button
                        key={status}
                        onClick={() => handleStatusUpdate(status)}
                        disabled={selectedOrder.orderStatus === status || statusUpdateLoading}
                        className={`px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors ${
                          selectedOrder.orderStatus === status 
                            ? 'bg-[var(--gold)] text-black border border-[var(--gold)] cursor-default'
                            : 'bg-white border border-orange-200 text-orange-800 hover:bg-orange-100'
                        }`}
                      >
                        {statusUpdateLoading && selectedOrder.orderStatus !== status ? '...' : status}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="w-full md:w-1/3 space-y-6">
                <div>
                  <h3 className="font-bold uppercase tracking-widest text-xs mb-3 text-[var(--text-secondary)]">Customer Info</h3>
                  <div className="bg-gray-50 border border-[var(--border)] p-4 rounded-lg text-sm space-y-1">
                    <p className="font-bold text-base">{selectedOrder.customer.name}</p>
                    <p>{selectedOrder.customer.email}</p>
                    <p>{selectedOrder.customer.phone}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold uppercase tracking-widest text-xs mb-3 text-[var(--text-secondary)]">Shipping Address</h3>
                  <div className="bg-gray-50 border border-[var(--border)] p-4 rounded-lg text-sm space-y-1">
                    <p>{selectedOrder.customer.address.line1}</p>
                    <p>{selectedOrder.customer.address.city}, {selectedOrder.customer.address.state}</p>
                    <p>{selectedOrder.customer.address.pincode}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold uppercase tracking-widest text-xs mb-3 text-[var(--text-secondary)]">Payment Details</h3>
                  <div className="bg-gray-50 border border-[var(--border)] p-4 rounded-lg text-sm">
                    <div className="flex justify-between mb-2">
                      <span className="text-[var(--text-secondary)]">Total Amount</span>
                      <span className="font-bold">{formatPrice(selectedOrder.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-[var(--text-secondary)]">Status</span>
                      <span className="font-semibold uppercase text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded">{selectedOrder.paymentStatus}</span>
                    </div>
                    {selectedOrder.razorpayPaymentId && (
                      <div className="mt-4 pt-4 border-t border-[var(--border)] break-all">
                        <span className="text-xs text-[var(--text-secondary)] block mb-1">Razorpay ID:</span>
                        <span className="font-mono text-[10px]">{selectedOrder.razorpayPaymentId}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
