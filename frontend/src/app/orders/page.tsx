import { getSettings } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import AnnouncementBar from '@/components/layout/AnnouncementBar';
import OrdersClient from './OrdersClient';

export default async function OrdersPage() {
  let settings = null;
  try {
    settings = await getSettings();
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
  
  const activeHomepage = settings?.activeHomepage || 'allensolly';

  let navVariant: 'default' | 'minimal' | 'catalogue' = 'default';
  if (activeHomepage === 'magazine') navVariant = 'minimal';
  if (activeHomepage === 'catalogue') navVariant = 'catalogue';

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] font-sans">
      {navVariant !== 'minimal' && <AnnouncementBar />}
      <Navbar variant={navVariant} />
      <div className="flex-grow pt-[64px] md:pt-0">
        <OrdersClient theme={activeHomepage} />
      </div>
      <Footer />
    </div>
  );
}
