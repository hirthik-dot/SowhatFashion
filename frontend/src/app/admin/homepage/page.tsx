'use client';

import { useEffect, useState } from 'react';
import AdminHeader from '@/components/admin/AdminHeader';
import HomepageSwitcher from '@/components/admin/HomepageSwitcher';
import PlaceholderEditor from '@/components/admin/PlaceholderEditor';
import { adminGetSettings } from '@/lib/api';

export default function AdminHomepageConfigPage() {
  const [activeHomepage, setActiveHomepage] = useState<'allensolly' | 'magazine' | 'catalogue'>('allensolly');
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = () => {
    adminGetSettings()
      .then((data) => {
        setSettings(data);
        if (data?.activeHomepage) {
          setActiveHomepage(data.activeHomepage);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load settings:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div>
      <AdminHeader title="Homepage Configuration" />
      
      <div className="p-6 md:p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h2 className="text-xl font-bold font-playfair mb-2">Select Active Homepage</h2>
          <p className="text-[var(--text-secondary)]">
            Changes made here will instantly revalidate the frontend (`/`) using Next.js On-Demand ISR.
          </p>
        </div>

        <HomepageSwitcher 
          currentHomepage={activeHomepage} 
          onUpdate={(type) => setActiveHomepage(type)} 
        />

        <PlaceholderEditor settings={settings} onUpdate={fetchSettings} />
      </div>
    </div>
  );
}
