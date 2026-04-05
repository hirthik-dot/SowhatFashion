'use client';

import AdminHeader from '@/components/admin/AdminHeader';
import { adminGetCustomers } from '@/lib/api';
import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/utils';
import { Search, Eye, X, Mail, Phone, MapPin, Calendar } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<any>(null);
  const [loadingModal, setLoadingModal] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    newThisMonth: 0,
    returning: 0,
    avgOrderValue: 0
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const data = await adminGetCustomers();
      setCustomers(data);
      
      // Compute stats
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const newThisMonth = data.filter((c: any) => new Date(c.createdAt) >= firstDayOfMonth).length;
      const returning = data.filter((c: any) => c.totalOrders > 1).length;
      
      let totalSpentAll = 0;
      let totalOrdersAll = 0;
      data.forEach((c: any) => {
        totalSpentAll += c.totalSpent || 0;
        totalOrdersAll += c.totalOrders || 0;
      });
      
      const avgOrderValue = totalOrdersAll > 0 ? totalSpentAll / totalOrdersAll : 0;

      setStats({
        total: data.length,
        newThisMonth,
        returning,
        avgOrderValue
      });
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCustomerId) {
      fetchCustomerDetail(selectedCustomerId);
    } else {
      setSelectedCustomerDetail(null);
    }
  }, [selectedCustomerId]);

  const fetchCustomerDetail = async (id: string) => {
    setLoadingModal(true);
    try {
      const data = await import('@/lib/api').then(m => m.adminGetCustomerById(id));
      setSelectedCustomerDetail(data);
    } catch (error) {
      console.error('Failed to fetch customer detail:', error);
    } finally {
      setLoadingModal(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="bg-gray-50 min-h-screen pb-12">
      <AdminHeader title="Customers" />

      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* STATS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 mb-1">Total Customers</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 mb-1">New This Month</h3>
            <p className="text-2xl font-bold text-green-600">{stats.newThisMonth}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 mb-1">Returning Customers</h3>
            <p className="text-2xl font-bold text-amber-600">{stats.returning}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 mb-1">Avg Order Value</h3>
            <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.avgOrderValue)}</p>
          </div>
        </div>

        {/* CONTROLS */}
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, email or phone..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* CUSTOMERS TABLE */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 font-semibold">Orders</th>
                  <th className="px-6 py-4 font-semibold">Total Spent</th>
                  <th className="px-6 py-4 font-semibold">Joined</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading customers...</td></tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-gray-500">No customers found.</td></tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                            {customer.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{customer.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 space-y-1 text-xs">
                        <div className="flex items-center gap-2"><Mail size={12}/> {customer.email}</div>
                        {customer.phone && <div className="flex items-center gap-2"><Phone size={12}/> {customer.phone}</div>}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-900">{customer.totalOrders}</td>
                      <td className="px-6 py-4 font-semibold text-amber-600">{formatPrice(customer.totalSpent)}</td>
                      <td className="px-6 py-4 text-gray-500">{new Date(customer.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setSelectedCustomerId(customer._id)}
                          className="p-2 text-gray-400 hover:text-amber-600 transition-colors bg-gray-50 hover:bg-amber-50 rounded-lg"
                        >
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* CUSTOMER DETAIL MODAL */}
      {selectedCustomerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold font-playfair">Customer Details</h2>
              <button 
                onClick={() => setSelectedCustomerId(null)}
                className="p-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
                title="Close Modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {loadingModal || !selectedCustomerDetail ? (
                <div className="py-12 text-center text-gray-500 animate-pulse">Loading customer details...</div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row gap-8 mb-8">
                    {/* Avatar & Basic Info */}
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-3xl shrink-0">
                        {selectedCustomerDetail.name?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{selectedCustomerDetail.name}</h3>
                        <p className="text-gray-500 flex items-center gap-2 mt-1"><Calendar size={14}/> Joined {new Date(selectedCustomerDetail.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Contact Card */}
                    <div className="md:ml-auto bg-gray-50 p-4 rounded-xl space-y-2 text-sm text-gray-600 min-w-[250px]">
                      <div className="flex items-center gap-3"><Mail size={16} className="text-gray-400"/> {selectedCustomerDetail.email}</div>
                      {selectedCustomerDetail.phone && <div className="flex items-center gap-3"><Phone size={16} className="text-gray-400"/> {selectedCustomerDetail.phone}</div>}
                    </div>
                  </div>

                  {/* Order History */}
                  <h4 className="font-bold text-gray-900 mb-4 font-playfair text-lg">Order History ({selectedCustomerDetail.orders?.length || selectedCustomerDetail.totalOrders})</h4>
                  
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50/50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Order ID</th>
                          <th className="px-4 py-3 font-semibold">Date</th>
                          <th className="px-4 py-3 font-semibold">Amount</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {selectedCustomerDetail.orders && selectedCustomerDetail.orders.length > 0 ? (
                          selectedCustomerDetail.orders.map((order: any) => (
                        <tr key={order._id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-mono text-gray-900">{order._id.substring(order._id.length - 8)}</td>
                          <td className="px-4 py-3 text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{formatPrice(order.totalAmount)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-full ${
                              order.orderStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                              order.orderStatus === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {order.orderStatus}
                            </span>
                          </td>
                        </tr>
                          ))
                        ) : (
                          <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No orders placed yet.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
