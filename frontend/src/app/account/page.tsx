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
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Profile form state
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    dob: '',
    gender: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        phone: user.phone || '',
        dob: user.dob || '',
        gender: user.gender || ''
      });
    }
  }, [user]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setToastMsg('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(profileData)
      });
      const data = await res.json();
      if (data.success) {
        useAuthStore.getState().setUser(data.user);
        setToastMsg('Profile saved successfully!');
        setTimeout(() => setToastMsg(''), 3000);
      } else {
        setToastMsg(data.message || 'Failed to save profile');
        setTimeout(() => setToastMsg(''), 3000);
      }
    } catch (err) {
      setToastMsg('Network error');
      setTimeout(() => setToastMsg(''), 3000);
    } finally {
      setSavingProfile(false);
    }
  };

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
        const token = localStorage.getItem('token');
        const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

        if (activeTab === 'orders') {
           const res = await fetch(`${url}/api/orders/my-orders`, { headers });
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
           <button onClick={() => handleTabChange('profile')} className={`text-left px-4 py-3 rounded-lg font-medium transition-colors ${activeTab === 'profile' ? 'bg-[#C9A84C] text-black' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
             👤 Profile
           </button>
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
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-xl font-bold mb-6 font-['Playfair_Display']">My Profile</h2>
                  {toastMsg && (
                    <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
                      {toastMsg}
                    </div>
                  )}
                  <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 rounded-full bg-[#C9A84C] text-black text-3xl font-bold flex items-center justify-center shadow-md">
                      {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover" alt="Avatar" /> : user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{user.name}</h3>
                      <p className="text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  
                  <form onSubmit={handleProfileSave} className="space-y-5 max-w-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input type="text" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#C9A84C] focus:border-[#C9A84C] bg-white outline-none" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-xs text-gray-400 font-normal">(Read-only)</span></label>
                      <input type="email" value={user.email} disabled className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                      <input type="tel" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#C9A84C] focus:border-[#C9A84C] bg-white outline-none" placeholder="+91 9876543210" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                      <input type="date" value={profileData.dob} onChange={e => setProfileData({...profileData, dob: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#C9A84C] focus:border-[#C9A84C] bg-white outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                      <select value={profileData.gender} onChange={e => setProfileData({...profileData, gender: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#C9A84C] focus:border-[#C9A84C] bg-white outline-none">
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                    <button type="submit" disabled={savingProfile} className="mt-4 bg-[#C9A84C] hover:bg-[#B59640] text-black font-bold py-3 px-8 rounded-lg tracking-wide transition-colors disabled:opacity-50">
                      {savingProfile ? 'SAVING...' : 'SAVE CHANGES'}
                    </button>
                  </form>
                </div>
              )}

              {activeTab === 'orders' && (
                <div>
                  <h2 className="text-xl font-bold mb-6 font-['Playfair_Display']">Order History</h2>
                  {orders.length === 0 ? (
                    <p className="text-gray-500">No orders yet. Start shopping!</p>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((o) => (
                        <div key={o._id} className="border border-gray-200 rounded-lg overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md">
                          <div 
                            className="p-5 flex justify-between items-center bg-white cursor-pointer"
                            onClick={() => setExpandedOrderId(expandedOrderId === o._id ? null : o._id)}
                          >
                            <div>
                              <p className="font-bold font-['Playfair_Display'] text-lg">Order #{o.orderId || o._id.substring(o._id.length-8).toUpperCase()}</p>
                              <p className="text-sm text-gray-500 mt-1">{new Date(o.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                              <p className="font-bold text-[#C9A84C]">₹{o.totalAmount || o.total}</p>
                              <span className={`text-xs px-3 py-1 font-semibold rounded-full uppercase tracking-wider ${
                                o.orderStatus === 'delivered' ? 'bg-green-100 text-green-700' :
                                o.orderStatus === 'shipped' ? 'bg-blue-100 text-blue-700' :
                                o.orderStatus === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>{o.orderStatus || o.status}</span>
                            </div>
                          </div>
                          
                          {/* Expanded Details */}
                          {expandedOrderId === o._id && (
                            <div className="p-5 border-t border-gray-100 bg-gray-50">
                              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-4">Items in Order</h4>
                              <div className="space-y-3">
                                {o.items && o.items.map((item: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-4 bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                    <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                                      {item.image || item.product?.images?.[0] ? (
                                        <img src={item.image || item.product?.images?.[0]} alt={item.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">No Img</div>
                                      )}
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-medium text-black line-clamp-1">{item.name || item.product?.name}</p>
                                      <p className="text-sm text-gray-500 mt-0.5">
                                        Qty: {item.quantity} {item.size && `| Size: ${item.size}`}
                                      </p>
                                    </div>
                                    <div className="font-bold text-gray-700">
                                      ₹{item.price}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="mt-5 flex justify-end">
                                <button className="text-sm font-bold text-[#C9A84C] hover:text-[#B59640] uppercase tracking-wider bg-white px-4 py-2 border border-[#C9A84C] rounded-md transition-colors" onClick={() => router.push(`/orders/${o._id}`)}>
                                  View Full Invoice
                                </button>
                              </div>
                            </div>
                          )}
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
