'use client';
import { Suspense, useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { useRouter, useSearchParams } from 'next/navigation';
import ProductCard from '@/components/shared/ProductCard';

function AccountContent() {
  const { user, isLoggedIn, openAuthModal, logout } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'orders');
  
  const [orders, setOrders] = useState<any[]>([]);
  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Switch tab in URL
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    router.replace(`/account?tab=${tab}`, { scroll: false });
  };

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/');
      setTimeout(() => openAuthModal(), 100);
      return;
    }
    
    // Fetch data based on active tab
    const fetchData = async () => {
      setLoading(true);
      try {
        const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        if (activeTab === 'orders') {
           const res = await fetch(`${url}/api/orders/track?email=${encodeURIComponent(user?.email || '')}`);
           const data = await res.json();
           if (data.success) {
             setOrders(data.orders || []);
           }
        } else if (activeTab === 'wishlist') {
           const res = await fetch(`${url}/api/users/wishlist`);
           const data = await res.json();
           if (data.success) {
             setWishlistProducts(data.wishlist || []);
           }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, isLoggedIn, user, router, openAuthModal]);

  if (!isLoggedIn || !user) {
    return <div className="min-h-screen py-20 text-center">Redirecting...</div>;
  }

  // Address logic inline for simplicity since it's just frontend state
  return (
    <div className="min-h-screen pt-20 pb-24 max-w-7xl mx-auto px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-8 font-['Playfair_Display']">My Account</h1>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 flex flex-col gap-2">
           <button onClick={() => handleTabChange('orders')} className={`text-left px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'orders' ? 'bg-[#C9A84C] text-black' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
             📦 My Orders
           </button>
           <button onClick={() => handleTabChange('wishlist')} className={`text-left px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'wishlist' ? 'bg-[#C9A84C] text-black' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
             ❤ Wishlist
           </button>
           <button onClick={() => handleTabChange('addresses')} className={`text-left px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'addresses' ? 'bg-[#C9A84C] text-black' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
             📍 Addresses
           </button>
           <button onClick={() => { logout(); router.push('/'); }} className="text-left px-4 py-3 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-colors mt-4">
             Logout
           </button>
        </div>

        <div className="flex-1 bg-white p-6 rounded-xl border border-gray-100 shadow-sm min-h-[500px]">
          {loading ? (
             <div className="flex justify-center items-center py-20 text-gray-500">Loading...</div>
          ) : (
            <>
              {activeTab === 'orders' && (
                <div>
                  <h2 className="text-xl font-bold mb-6 font-['Playfair_Display']">Order History</h2>
                  {orders.length === 0 ? (
                    <p className="text-gray-500">No orders found.</p>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((o) => (
                        <div key={o._id} className="border border-gray-200 p-4 rounded-lg flex justify-between items-center">
                          <div>
                            <p className="font-bold">Order #{o.orderId || o._id.substring(o._id.length-6)}</p>
                            <p className="text-sm text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">₹{o.total}</p>
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">{o.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'wishlist' && (
                <div>
                  <h2 className="text-xl font-bold mb-6 font-['Playfair_Display']">My Wishlist</h2>
                  {wishlistProducts.length === 0 ? (
                    <p className="text-gray-500">Your wishlist is empty.</p>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                      {wishlistProducts.map((p) => (
                        <ProductCard key={p._id} product={p} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'addresses' && (
                <div>
                  <h2 className="text-xl font-bold mb-6 font-['Playfair_Display']">Saved Addresses</h2>
                  <div className="space-y-4">
                     {user.savedAddresses && user.savedAddresses.length > 0 ? user.savedAddresses.map((addr: any, idx) => (
                       <div key={idx} className="border border-gray-200 p-4 rounded-lg relative">
                          <div className="flex justify-between">
                            <h3 className="font-bold flex items-center gap-2">
                              {addr.label}
                              {addr.isDefault && <span className="text-xs bg-[var(--gold)] px-2 py-0.5 rounded text-white">Default</span>}
                            </h3>
                          </div>
                          <p className="text-gray-600 text-sm mt-2">{addr.line1}</p>
                          <p className="text-gray-600 text-sm">{addr.city}, {addr.state} {addr.pincode}</p>
                       </div>
                     )) : (
                         <p className="text-gray-500">No saved addresses yet.</p>
                     )}
                     <button className="border border-dashed border-[var(--gold)] text-[var(--gold)] w-full py-4 rounded-lg font-bold hover:bg-[var(--gold)] hover:text-white transition-colors">
                        + Add New Address
                     </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-screen py-20 text-center">Loading...</div>}>
      <AccountContent />
    </Suspense>
  );
}
