'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import { adminGetSettings, adminUpdateSettings } from '@/lib/api';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  
  const [formData, setFormData] = useState({
    announcementText: '',
    freeDeliveryAbove: 999,
    whatsappNumber: '',
    instagramHandle: ''
  });

  useEffect(() => {
    adminGetSettings()
      .then((settings) => {
        if (settings) {
          setFormData({
            announcementText: settings.announcementText || '',
            freeDeliveryAbove: settings.freeDeliveryAbove || 999,
            whatsappNumber: settings.whatsappNumber || '',
            instagramHandle: settings.instagramHandle || ''
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load settings', err);
        setLoading(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminUpdateSettings(formData);
      setToast('Settings saved successfully!');
      setTimeout(() => setToast(''), 3000);
    } catch (error) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8">Loading settings...</div>;

  return (
    <div>
      <AdminHeader title="Store Settings" />
      
      {toast && (
        <div className="fixed top-4 right-4 bg-[var(--success)] text-white px-6 py-3 rounded shadow-lg z-50 flex items-center gap-2 toast-enter">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span className="font-medium">{toast}</span>
        </div>
      )}

      <div className="p-6 md:p-8 max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-[var(--border)] shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[var(--border)] bg-gray-50 flex items-center gap-3">
            <div className="p-2 bg-[var(--gold-light)] rounded-lg text-[var(--gold-hover)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0 1.51 1z"/></svg>
            </div>
            <h2 className="text-xl font-bold font-playfair">General Preferences</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Announcement Bar Text</label>
              <textarea 
                value={formData.announcementText} 
                onChange={(e) => setFormData({...formData, announcementText: e.target.value})} 
                rows={2}
                className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]"
                placeholder="FREE DELIVERY ABOVE ₹999 | SALE UP TO 50% OFF"
              ></textarea>
              <p className="text-[10px] text-gray-500 mt-1">This text scrolls at the very top of the homepage.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Free Delivery Threshold (₹)</label>
              <input 
                type="number" 
                min="0"
                value={formData.freeDeliveryAbove} 
                onChange={(e) => setFormData({...formData, freeDeliveryAbove: Number(e.target.value)})} 
                className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-[var(--border)]">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">WhatsApp Contact Number</label>
                <input 
                  type="text" 
                  value={formData.whatsappNumber} 
                  onChange={(e) => setFormData({...formData, whatsappNumber: e.target.value})} 
                  placeholder="+919876543210"
                  className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Instagram Handle</label>
                <input 
                  type="text" 
                  value={formData.instagramHandle} 
                  onChange={(e) => setFormData({...formData, instagramHandle: e.target.value})} 
                  placeholder="@sowaatmenswear"
                  className="w-full border border-[var(--border)] rounded px-3 py-2 outline-none focus:border-[var(--gold)]"
                />
              </div>
            </div>

            <div className="pt-8 flex">
              <button 
                type="submit" 
                disabled={saving}
                className="btn-gold rounded px-10 py-3 ml-auto flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
