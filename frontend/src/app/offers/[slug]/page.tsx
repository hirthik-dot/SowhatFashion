import { notFound } from 'next/navigation';
import Image from 'next/image';
import { getOfferBySlugOrId, getActiveOfferSlugs, getProducts } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/shared/ProductCard';
import OfferProductsClient, { OfferCountdownLive } from './OfferProductsClient';

export const revalidate = 60;

export async function generateStaticParams() {
  try {
    const slugs = await getActiveOfferSlugs();
    return (slugs || []).map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export default async function OfferDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let offer: any;
  try {
    offer = await getOfferBySlugOrId(slug);
  } catch {
    notFound();
  }

  const end = offer.endTime ? new Date(offer.endTime).getTime() : null;
  const expired = end !== null && end < Date.now();

  let related: any[] = [];
  try {
    const firstCat = offer.products?.[0]?.category;
    const res = await getProducts(firstCat ? `limit=8&category=${firstCat}` : 'limit=8');
    const all = res?.products || [];
    const ids = new Set((offer.products || []).map((p: any) => String(p._id)));
    related = all.filter((p: any) => !ids.has(String(p._id))).slice(0, 4);
  } catch {
    related = [];
  }

  const img = offer.image || offer.products?.[0]?.images?.[0] || '/placeholder.jpg';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface)]">
      <Navbar variant="default" />

      <section className="relative w-full h-[220px] md:h-[280px] bg-neutral-900 text-white overflow-hidden">
        <Image src={img} alt="" fill className="object-cover opacity-50" sizes="100vw" priority />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/30" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 h-full flex flex-col justify-center">
          {expired && (
            <div className="mb-3 inline-block bg-[var(--sale-red)] text-white text-xs font-bold px-3 py-1 uppercase tracking-wide w-fit">
              This offer has ended — products below are still available
            </div>
          )}
          <h1 className="font-playfair text-3xl md:text-4xl font-bold">{offer.title}</h1>
          {offer.subtitle && <p className="text-white/80 mt-2 max-w-xl">{offer.subtitle}</p>}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            {offer.discountLabel ? (
              <span className="bg-[var(--gold)] text-black font-bold px-3 py-1 text-sm">{offer.discountLabel}</span>
            ) : offer.discountPercent ? (
              <span className="bg-[var(--gold)] text-black font-bold px-3 py-1 text-sm">{offer.discountPercent}% OFF</span>
            ) : null}
            {offer.hasCountdown && offer.endTime && !expired && (
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider text-white/70">Ends in</span>
                <OfferCountdownLive end={offer.endTime} />
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-10 w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-[var(--border)] pb-6">
          <div>
            <h2 className="text-xl font-playfair font-bold">Products in this offer</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {(offer.products || []).length} products available
            </p>
          </div>
        </div>

        <OfferProductsClient products={offer.products || []} />

        {related.length > 0 && (
          <section className="mt-16">
            <h3 className="text-lg font-playfair font-bold mb-6">You might also like</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {related.map((p: any) => (
                <div key={p._id} className="min-w-[160px] w-[160px] shrink-0">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
