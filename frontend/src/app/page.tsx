import { getSettings, getProducts, getOffers } from '@/lib/api';
import AllenSollyHome from '@/components/homepage/AllenSollyHome';
import MagazineHome from '@/components/homepage/MagazineHome';
import CatalogueHome from '@/components/homepage/CatalogueHome';

export const revalidate = 30; // ISR revalidate every 30 seconds

export default async function Home() {
  try {
    const [settings, productsRes, offers] = await Promise.all([
      getSettings(),
      getProducts('limit=20'), // Get top products for homepage
      getOffers(true) // Only offers mapped to homepage
    ]);

    const activeHomepage = settings?.activeHomepage || 'allensolly';
    const products = productsRes?.products || [];

    // Dynamically render the active homepage
    switch (activeHomepage) {
      case 'magazine':
        return <MagazineHome products={products} offers={offers} settings={settings} />;
      case 'catalogue':
        return <CatalogueHome products={products} offers={offers} settings={settings} />;
      case 'allensolly':
      default:
        return <AllenSollyHome products={products} offers={offers} settings={settings} />;
    }
  } catch (error) {
    console.error('Failed to load homepage data:', error);
    // Fallback if backend is down
    return <AllenSollyHome products={[]} offers={[]} settings={null} />;
  }
}
