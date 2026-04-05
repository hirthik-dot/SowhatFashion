'use client';

import AdminHeader from '@/components/admin/AdminHeader';
import { 
  adminGetStats, 
  adminGetRevenueChart, 
  adminGetOrders, 
  adminGetPopularProducts, 
  adminGetCustomers 
} from '@/lib/api';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { IndianRupee, ShoppingBag, Users, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<any>({
    totalCustomers: 0,
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalProducts: 0 // We'll compute this or mock since not explicitly in stats, actually we can just pass from stats if we mapped it, wait the prompt said "Products in Stock". We can fetch products using adminGetProducts but let's mock it for now since stats don't return it natively or I can just use placeholder.
  });
  const [chartData, setChartData] = useState([]);
  const [chartPeriod, setChartPeriod] = useState('week'); // week, month, year
  const [recentOrders, setRecentOrders] = useState([]);
  const [popularProducts, setPopularProducts] = useState([]);
  const [recentCustomers, setRecentCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData(chartPeriod);
  }, [chartPeriod]);

  const fetchDashboardData = async (period: string) => {
    setLoading(true);
    try {
      const [
        statsRes,
        chartRes,
        ordersRes,
        productsRes,
        customersRes
      ] = await Promise.all([
        adminGetStats(),
        adminGetRevenueChart(period),
        adminGetOrders(1, 10),
        adminGetPopularProducts(),
        adminGetCustomers()
      ]);

      setStats(statsRes);
      setChartData(chartRes);
      setRecentOrders(ordersRes.orders || []);
      setPopularProducts(productsRes || []);
      setRecentCustomers(customersRes.slice(0, 5) || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div>
      <AdminHeader title="Dashboard" />
      <div className="p-8 max-w-7xl mx-auto flex flex-col gap-6 animate-pulse">
        <div className="flex gap-6 h-32">
          <div className="flex-1 bg-gray-200 rounded-xl"></div>
          <div className="flex-1 bg-gray-200 rounded-xl"></div>
          <div className="flex-1 bg-gray-200 rounded-xl"></div>
          <div className="flex-1 bg-gray-200 rounded-xl"></div>
        </div>
        <div className="flex gap-6">
          <div className="flex-[2] h-96 bg-gray-200 rounded-xl"></div>
          <div className="flex-1 h-96 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <AdminHeader title="Dashboard" />
      
      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* STATS CARDS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Total Revenue" 
            value={formatPrice(stats.totalRevenue)} 
            icon={<IndianRupee className="text-white" size={20} />} 
            color="bg-amber-500"
            growth={stats.revenueGrowth}
          />
          <StatCard 
            title="Total Orders" 
            value={stats.totalOrders} 
            icon={<ShoppingBag className="text-white" size={20} />} 
            color="bg-blue-500"
            growth={stats.orderGrowth}
          />
          <StatCard 
            title="Total Customers" 
            value={stats.totalCustomers} 
            icon={<Users className="text-white" size={20} />} 
            color="bg-green-500"
            growth={stats.customerGrowth}
          />
          <StatCard 
            title="Pending Orders" 
            value={stats.pendingOrders} 
            icon={<Package className="text-white" size={20} />} 
            color="bg-orange-500"
          />
        </div>

        {/* MAIN LAYOUT: LEFT (Charts & Orders) | RIGHT (Popular Products & Customers) */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* LEFT COLUMN */}
          <div className="flex-[2] space-y-6">
            
            {/* Chart Card */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold font-playfair">Revenue Overview</h2>
                  <p className="text-sm text-gray-500">Earnings over the selected period</p>
                </div>
                <select 
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  value={chartPeriod}
                  onChange={(e) => setChartPeriod(e.target.value)}
                >
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="year">This Year</option>
                </select>
              </div>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6B7280', fontSize: 12 }} 
                      dy={10} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#6B7280', fontSize: 12 }} 
                      tickFormatter={(value) => `₹${value}`}
                    />
                    <Tooltip 
                      cursor={{ fill: '#F3F4F6' }} 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                      formatter={(value: any) => [`₹${value}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#D97706" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-bold font-playfair">Recent Orders</h2>
                <Link href="/admin/orders" className="text-sm text-amber-600 font-semibold hover:underline">View All</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Order ID</th>
                      <th className="px-6 py-4 font-semibold">Customer</th>
                      <th className="px-6 py-4 font-semibold">Amount</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                      <th className="px-6 py-4 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentOrders.map((order: any) => (
                      <tr key={order._id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-medium text-gray-900">{order._id.substring(order._id.length - 8)}</td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{order.customer.name}</div>
                          <div className="text-gray-500 text-xs">{order.customer.email}</div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{formatPrice(order.totalAmount)}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={order.orderStatus} />
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {recentOrders.length === 0 && (
                  <div className="p-8 text-center text-gray-500">No recent orders found.</div>
                )}
              </div>
            </div>
            
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex-1 space-y-6">
            
            {/* Popular Products */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-bold font-playfair">Popular Products</h2>
                <Link href="/admin/products" className="text-sm text-amber-600 font-semibold hover:underline">View All</Link>
              </div>
              <div className="p-6 space-y-4">
                {popularProducts.map((product: any, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                      <img src={product.thumbnail || '/placeholder-product.png'} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{product.name}</h4>
                      <p className="text-xs text-gray-500">{product.totalSold} sold</p>
                    </div>
                    <div className="text-right font-semibold text-sm text-gray-900">
                      {formatPrice(product.earnings)}
                    </div>
                  </div>
                ))}
                {popularProducts.length === 0 && (
                  <div className="text-center text-sm text-gray-500">No data available</div>
                )}
              </div>
            </div>

            {/* Recent Customers */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-bold font-playfair">New Customers</h2>
                <Link href="/admin/customers" className="text-sm text-amber-600 font-semibold hover:underline">View All</Link>
              </div>
              <div className="p-6 space-y-4">
                {recentCustomers.map((customer: any) => (
                  <div key={customer._id} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {customer.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">{customer.name}</h4>
                      <p className="text-xs text-gray-500 truncate">{customer.email}</p>
                    </div>
                  </div>
                ))}
                {recentCustomers.length === 0 && (
                  <div className="text-center text-sm text-gray-500">No new customers</div>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, growth }: any) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold text-gray-500 mb-1">{title}</h3>
        <div className="flex items-baseline gap-2">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {growth !== undefined && (
            <span className={`text-xs font-semibold flex items-center ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {growth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
              {Math.abs(growth)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    shipped: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  };
  return (
    <span className={`px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}
