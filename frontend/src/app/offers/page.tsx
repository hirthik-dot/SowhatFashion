import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/shared/ProductCard';
import ComboOfferBanner from '@/components/shared/ComboOfferBanner';
import FlashSaleCountdown from '@/components/shared/FlashSaleCountdown';
import OfferBadge from '@/components/shared/OfferBadge';
import { getOffers } from '@/lib/api';

export const revalidate = 30; // ISR

export default async function OffersPage() {
  let offers = [];
  try {
    offers = await getOffers();
  } catch (error) {
    console.error('Failed to load offers:', error);
  }

  const flashSales = offers.filter((o: any) => o.type === 'flash');
  const comboOffers = offers.filter((o: any) => o.type === 'combo');
  const seasonalOffers = offers.filter((o: any) => o.type === 'seasonal');

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface)]">
      <Navbar variant="default" />

      {/* Hero */}
      <section className="bg-[var(--gold)] text-black py-20 px-4 text-center">
        <h1 className="text-4xl md:text-6xl font-playfair font-bold uppercase tracking-widest mb-4">Deals & Offers</h1>
        <p className="text-lg md:text-xl font-medium max-w-2xl mx-auto">Discover exclusive savings on premium menswear. Limited time only.</p>
      </section>

      <main className="flex-grow">
        {offers.length === 0 ? (
          <div className="py-32 text-center text-[var(--text-secondary)]">No active offers at the moment. Please check back later.</div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 py-16 space-y-24">
            
            {/* Flash Sales Section */}
            {flashSales.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-10 pb-4 border-b border-[var(--border)]">
                  <h2 className="text-3xl font-playfair font-bold">Flash Sales</h2>
                  <div className="w-2 h-2 bg-[var(--sale-red)] rounded-full animate-pulse"></div>
                </div>
                
                <div className="space-y-16">
                  {flashSales.map((offer: any) => (
                    <div key={offer._id} className="bg-white rounded-xl shadow-sm border border-[var(--border)] overflow-hidden">
                      <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8 bg-[var(--navbar-bg)] text-white">
                        <div className="text-center md:text-left">
                          <OfferBadge type="flash" className="mb-4" />
                          <h3 className="text-2xl md:text-3xl font-playfair font-bold mb-2">{offer.title}</h3>
                          <p className="text-gray-400">{offer.description}</p>
                        </div>
                        <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm border border-white/20">
                          <p className="text-xs uppercase tracking-widest text-[#bbb] mb-3 text-center">Ends In</p>
                          <FlashSaleCountdown endTime={offer.endTime} variant="gold" />
                        </div>
                      </div>
                      
                      <div className="p-6 md:p-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                          {offer.products?.map((p: any) => (
                            <ProductCard key={p._id} product={p} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Combo Deals */}
            {comboOffers.length > 0 && (
              <section>
                <h2 className="text-3xl font-playfair font-bold mb-10 pb-4 border-b border-[var(--border)]">Combo Deals</h2>
                <div className="space-y-8">
                  {comboOffers.map((offer: any) => (
                    <ComboOfferBanner
                      key={offer._id}
                      title={offer.title}
                      description={offer.comboDetails || offer.description}
                      variant="light"
                      ctaText="SHOP COMBO"
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Seasonal Collections */}
            {seasonalOffers.length > 0 && (
              <section>
                <h2 className="text-3xl font-playfair font-bold mb-10 pb-4 border-b border-[var(--border)]">Seasonal Collections</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {seasonalOffers.map((offer: any) => (
                    <div key={offer._id} className="bg-white p-8 rounded-xl border border-[var(--border)] text-center">
                      <OfferBadge type="seasonal" className="mb-6" />
                      <h3 className="text-2xl font-bold font-playfair mb-3">{offer.title}</h3>
                      <p className="text-[var(--text-secondary)] mb-8">{offer.description}</p>
                      <div className="grid grid-cols-3 gap-2">
                         {offer.products?.slice(0,3).map((p:any) => (
                            <div key={p._id} className="aspect-[3/4] bg-gray-100 rounded overflow-hidden relative border border-[var(--border)]"> {/* Real product images if populated */}
                              <img src={p.images?.[0] || '/placeholder.jpg'} alt={p.name} className="object-cover w-full h-full" />
                            </div>
                         ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
