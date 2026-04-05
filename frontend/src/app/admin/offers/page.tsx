'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { adminGetOffers, adminCreateOffer, adminUpdateOffer, adminDeleteOffer, adminGetProducts } from '@/lib/api';

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const initialForm = {
    title: '',
    description: '',
    type: 'flash',
    image: '',
    discountPercent: 0,
    comboDetails: '',
    products: [] as string[],
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    isActive: true,
    showOnHomepage: true
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchData = async () => {
    try {
      const [offersRes, productsRes] = await Promise.all([
        adminGetOffers(),
        adminGetProducts()
      ]);
      setOffers(offersRes);
      setProducts(productsRes.products || []);
    } catch (error) {
      console.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (offer?: any) => {
    if (offer) {
      setEditingId(offer._id);
      setFormData({
        ...offer,
        products: offer.products.map((p:any) => p._id),
        startTime: new Date(offer.startTime).toISOString().slice(0, 16),
        endTime: new Date(offer.endTime).toISOString().slice(0, 16),
      });
    } else {
      setEditingId(null);
      setFormData(initialForm);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await adminUpdateOffer(editingId, formData);
      } else {
        await adminCreateOffer(formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      alert('Failed to save offer');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this offer?')) {
      try {
        await adminDeleteOffer(id);
        fetchData();
      } catch (error) {
        alert('Failed to delete offer');
      }
    }
  };

  return (
    <div>
      <AdminHeader title="Offers & Promotions" />
      
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold font-playfair">Active Offers</h2>
          <button onClick={() => handleOpenModal()} className="btn-gold rounded px-6 py-2.5 shadow-sm text-sm">
            Create Offer
          </button>
        </div>

        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-[var(--border)] text-xs uppercase tracking-wider text-[var(--text-secondary)]">
              <tr>
                <th className="px-6 py-4 font-semibold">Title</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Discount</th>
                <th className="px-6 py-4 font-semibold">Duration</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center">Loading...</td></tr>
              ) : offers.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-[var(--text-secondary)]">No offers found.</td></tr>
              ) : offers.map((offer) => (
                <tr key={offer._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-black">{offer.title}</td>
                  <td className="px-6 py-4">
                    <span className="uppercase text-[10px] font-bold tracking-wider bg-gray-200 px-2 py-1 rounded">{offer.type}</span>
                  </td>
                  <td className="px-6 py-4">{offer.discountPercent}%</td>
                  <td className="px-6 py-4 text-xs text-[var(--text-secondary)]">
                    {new Date(offer.startTime).toLocaleDateString()} - <br/>
                    {new Date(offer.endTime).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                     <span className={`w-2.5 h-2.5 rounded-full inline-block mr-2 ${offer.isActive ? 'bg-[var(--success)]' : 'bg-gray-400'}`}></span>
                    {offer.isActive ? 'Active' : 'Draft'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button onClick={() => handleOpenModal(offer)} className="text-[var(--gold-hover)] hover:underline font-semibold">Edit</button>
                    <button onClick={() => handleDelete(offer._id)} className="text-[var(--sale-red)] hover:underline font-semibold">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-[var(--border)] flex justify-between items-center bg-gray-50">
                <h2 className="text-xl font-bold font-playfair">{editingId ? 'Edit Offer' : 'Create Offer'}</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-black">
                  ✕
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-grow">
                <form id="offer-form" onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Offer Title</label>
                      <input required type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Type</label>
                      <select required value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]">
                        <option value="flash">Flash Sale</option>
                        <option value="combo">Combo Offer</option>
                        <option value="seasonal">Seasonal</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Discount %</label>
                      <input required type="number" min="0" max="100" value={formData.discountPercent} onChange={(e) => setFormData({...formData, discountPercent: Number(e.target.value)})} className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Start Time</label>
                      <input required type="datetime-local" value={formData.startTime} onChange={(e) => setFormData({...formData, startTime: e.target.value})} className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">End Time</label>
                      <input required type="datetime-local" value={formData.endTime} onChange={(e) => setFormData({...formData, endTime: e.target.value})} className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]" />
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Description</label>
                      <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} rows={2} className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]"></textarea>
                    </div>

                    {formData.type === 'combo' && (
                      <div className="space-y-1 md:col-span-2">
                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Combo Details</label>
                        <textarea value={formData.comboDetails} onChange={(e) => setFormData({...formData, comboDetails: e.target.value})} rows={2} placeholder="E.g., Buy 2 Get 1 Free on selected t-shirts" className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]"></textarea>
                      </div>
                    )}

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Included Products (Hold Ctrl to select multiple)</label>
                      <select multiple value={formData.products} onChange={(e) => {
                        const values = Array.from(e.target.selectedOptions, option => option.value);
                        setFormData({...formData, products: values});
                      }} className="w-full h-32 border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]">
                        {products.map(p => (
                          <option key={p._id} value={p._id}>{p.name} (₹{p.price})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-3 md:col-span-2 pt-4 border-t border-[var(--border)] flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5 accent-[var(--success)]" />
                        <span className="font-semibold text-sm">Active</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formData.showOnHomepage} onChange={(e) => setFormData({...formData, showOnHomepage: e.target.checked})} className="w-5 h-5 accent-[var(--gold)]" />
                        <span className="font-semibold text-sm">Show on Homepage</span>
                      </label>
                    </div>

                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-[var(--border)] bg-gray-50 flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} type="button" className="px-6 py-2 border border-gray-300 rounded font-semibold text-gray-700 hover:bg-gray-100">Cancel</button>
                <button type="submit" form="offer-form" className="btn-gold rounded px-8 py-2">Save Offer</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
