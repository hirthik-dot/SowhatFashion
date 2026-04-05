'use client';

import AdminHeader from '@/components/admin/AdminHeader';
import { adminGetOrders, adminGetProducts } from '@/lib/api';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    pendingOrders: 0,
    totalProducts: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ordersRes, productsRes] = await Promise.all([
          adminGetOrders(1, 10),
          adminGetProducts()
        ]);

        const orders = ordersRes.orders || [];
        
        // Calculate today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayOrdersFilter = orders.filter((o: any) => new Date(o.createdAt) >= today);
        const revenue = todayOrdersFilter.reduce((acc: number, o: any) => acc + o.totalAmount, 0);
        const pending = orders.filter((o: any) => o.orderStatus === 'pending').length;

        setStats({
          todayOrders: todayOrdersFilter.length,
          todayRevenue: revenue,
          pendingOrders: pending,
          totalProducts: productsRes.total || 0
        });

        setRecentOrders(orders.slice(0, 5));
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  return (
    <div>
      <AdminHeader title="Dashboard" />
      
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-sm">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Today's Revenue</h3>
            <p className="text-3xl font-bold">{formatPrice(stats.todayRevenue)}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-sm">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Today's Orders</h3>
            <p className="text-3xl font-bold">{stats.todayOrders}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-sm">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Pending Orders</h3>
            <p className="text-3xl font-bold text-[var(--sale-red)]">{stats.pendingOrders}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-sm">
            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Total Products</h3>
            <p className="text-3xl font-bold">{stats.totalProducts}</p>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-gray-50/50">
            <h2 className="text-lg font-bold font-playfair">Recent Orders</h2>
            <Link href="/admin/orders" className="text-sm text-[var(--gold-hover)] font-semibold hover:underline">View All</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-secondary)]">
                <tr>
                  <th className="px-6 py-4 font-semibold">Order ID</th>
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">Amount</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {recentOrders.map((order: any) => (
                  <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium">{order._id.substring(order._id.length - 8)}</td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-black">{order.customer.name}</div>
                      <div className="text-[var(--text-secondary)]">{order.customer.email}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold">{formatPrice(order.totalAmount)}</td>
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
                    <td className="px-6 py-4 text-[var(--text-secondary)]">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recentOrders.length === 0 && (
              <div className="p-8 text-center text-[var(--text-secondary)]">No recent orders found.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
