import {
  getSettings,
  getProducts,
  getOffers,
  getCarouselOffers,
  getNewArrivals,
  getPublicOffers,
  getHomepageSections,
} from '@/lib/api';
import AllenSollyHome from '@/components/homepage/AllenSollyHome';
import MagazineHome from '@/components/homepage/MagazineHome';
import CatalogueHome from '@/components/homepage/CatalogueHome';

export const revalidate = 60;

export default async function Home() {
  try {
    const settings = await getSettings();
    const activeHomepage = settings?.activeHomepage || 'allensolly';

    const [productsRes, offers, carouselOffers, newArrivalsRes, publicOffers, catalogueSectionsRes] =
      await Promise.all([
        getProducts('limit=20'),
        getOffers(true),
        activeHomepage === 'catalogue' ? getCarouselOffers() : Promise.resolve([]),
        activeHomepage === 'catalogue' ? getNewArrivals(0, 8) : Promise.resolve({ items: [], hasMore: false }),
        activeHomepage === 'catalogue' ? getPublicOffers() : Promise.resolve([]),
        activeHomepage === 'catalogue' ? getHomepageSections('catalogue') : Promise.resolve(null),
      ]);

    const products = productsRes?.products || [];

    switch (activeHomepage) {
      case 'magazine':
        return <MagazineHome products={products} offers={offers} settings={settings} />;
      case 'catalogue':
        return (
          <CatalogueHome
            products={products}
            settings={settings}
            carouselOffers={Array.isArray(carouselOffers) ? carouselOffers : []}
            newArrivalsInitial={{
              items: newArrivalsRes?.items || [],
              hasMore: Boolean(newArrivalsRes?.hasMore),
            }}
            catalogueActiveOffers={Array.isArray(publicOffers) ? publicOffers : []}
            catalogueSectionsResponse={catalogueSectionsRes}
          />
        );
      case 'allensolly':
      default:
        return <AllenSollyHome products={products} offers={offers} settings={settings} />;
    }
  } catch (error) {
    console.error('Failed to load homepage data:', error);
    return <AllenSollyHome products={[]} offers={[]} settings={null} />;
  }
}
