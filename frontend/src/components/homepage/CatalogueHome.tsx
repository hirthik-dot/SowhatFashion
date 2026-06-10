'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import RotatingAnnouncementBar from '@/components/homepage/premium/RotatingAnnouncementBar';
import PremiumNavbar from '@/components/homepage/premium/PremiumNavbar';
import PremiumProductCard from '@/components/homepage/premium/PremiumProductCard';
import PremiumFooter from '@/components/homepage/premium/PremiumFooter';
import CatalogueHero from '@/components/homepage/CatalogueHero';
import { productListKey } from '@/lib/utils';
import { mergeCatalogueHomeSections, type CatalogueHomeSection } from '@/lib/catalogue-sections';
import {
  mergeHomepage3Placeholders,
  DEFAULT_CATEGORY_TILES,
  DEFAULT_HOMEPAGE3_PLACEHOLDERS,
} from '@/lib/homepage3-config';
import { cn } from '@/lib/utils';

const REVIEWS = [
  { quote: 'Impeccable fit and fabric. My go-to for minimalist wardrobe essentials.', name: 'Rahul M.', verified: true },
  { quote: 'Clean designs that actually last. Worth every rupee.', name: 'Arjun K.', verified: true },
  { quote: 'Fast delivery and the quality exceeds expectations every time.', name: 'Vikram S.', verified: true },
];

type BestsellerTab = 'week' | 'month' | 'all';

function CategoryTile({
  label,
  href,
  image,
  className = '',
}: {
  label: string;
  href: string;
  image: string;
  className?: string;
}) {
  return (
    <Link href={href} className={cn('group relative block overflow-hidden', className)}>
      <div className="relative aspect-[3/4] w-full bg-[#F5F5F3]">
        <Image src={image} alt={label} fill className="object-cover transition-transform duration-700 group-hover:scale-[1.05]" sizes="(max-width:768px) 33vw, 25vw" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/35 transition-colors duration-300" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 opacity-100 group-hover:opacity-100">
          <h3 className="font-cormorant text-2xl md:text-3xl font-light tracking-wide mb-2">{label}</h3>
          <span className="text-[11px] uppercase tracking-[0.2em] premium-link text-white/90">Shop Now →</span>
        </div>
      </div>
    </Link>
  );
}

export default function CatalogueHome({
  products = [],
  settings,
  carouselOffers = [],
  newArrivalsInitial = { items: [], hasMore: false },
  catalogueActiveOffers = [],
  catalogueSectionsResponse = null,
}: {
  products?: any[];
  settings?: any;
  carouselOffers?: any[];
  newArrivalsInitial?: { items: any[]; hasMore?: boolean };
  catalogueActiveOffers?: any[];
  catalogueSectionsResponse?: { sections?: CatalogueHomeSection[] } | null;
}) {
  const p = useMemo(
    () => mergeHomepage3Placeholders(settings?.placeholders?.catalogue),
    [settings]
  );
  const heroSlides: string[] = useMemo(() => {
    const desktop = p.heroDesktop?.trim();
    if (desktop) return [desktop];
    const fromCarousel = p.carouselImages?.filter(Boolean);
    if (fromCarousel?.length) return fromCarousel as string[];
    if (carouselOffers?.length) {
      return carouselOffers.map((o: any) => o.image || o.bannerImage).filter(Boolean);
    }
    return [];
  }, [p, carouselOffers]);

  const heroMobileSrc = p.heroMobile?.trim() || heroSlides[0];

  const categoryTiles = p.categoryTiles || DEFAULT_CATEGORY_TILES;
  const row1 = categoryTiles.slice(0, 3);
  const row2 = categoryTiles.slice(3, 5);

  const [bestsellerTab, setBestsellerTab] = useState<BestsellerTab>('week');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const sections = useMemo(
    () => mergeCatalogueHomeSections(catalogueSectionsResponse?.sections),
    [catalogueSectionsResponse]
  );
  const isVisible = (id: string) => sections.find((s) => s.id === id)?.isVisible !== false;

  const newArrivalProducts = useMemo(() => {
    const fromApi = (newArrivalsInitial?.items || [])
      .map((row: any) => row.product)
      .filter(Boolean)
      .slice(0, 8);
    if (fromApi.length) return fromApi;
    return products.filter((x: any) => x.isNewArrival).slice(0, 8);
  }, [newArrivalsInitial, products]);

  const bestsellers = useMemo(() => {
    if (bestsellerTab === 'week') {
      return products.filter((x: any) => x.isNewArrival).slice(0, 10);
    }
    if (bestsellerTab === 'month') {
      const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return products
        .filter((x: any) => x.createdAt && new Date(x.createdAt).getTime() > monthAgo)
        .slice(0, 10);
    }
    return products.filter((x: any) => x.isFeatured).slice(0, 10) || products.slice(0, 10);
  }, [products, bestsellerTab]);

  const saleProducts = useMemo(() => {
    const withDiscount = products.filter(
      (x: any) => x.discountPrice && x.discountPrice < x.price
    );
    return withDiscount.slice(0, 4);
  }, [products]);

  const instagramImages: string[] = useMemo(
    () => (p.instagramImages?.filter(Boolean) as string[])?.slice(0, 6) || [],
    [p]
  );

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) setSubscribed(true);
  };

  return (
    <div className="min-h-screen bg-white text-[#111111] font-sans">
      <RotatingAnnouncementBar customText={settings?.announcementText} />
      <PremiumNavbar overHero />

      <CatalogueHero
        settings={settings}
        products={products}
        heroSlides={heroSlides.length ? heroSlides : [DEFAULT_HOMEPAGE3_PLACEHOLDERS.heroDesktop!].filter(Boolean)}
        heroMobileSrc={heroMobileSrc || DEFAULT_HOMEPAGE3_PLACEHOLDERS.heroDesktop!}
        heroAlt={p.heroMobileAlt || p.heroDesktopAlt || 'Hero'}
      />

      {/* Category tiles */}
      <section className="py-16 md:py-24 px-4 md:px-6 max-w-7xl mx-auto">
        <h2 className="text-center text-[11px] uppercase tracking-[0.25em] text-[#111] mb-10 md:mb-14 font-medium">
          SHOP BY CATEGORY
        </h2>
        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-2 md:mb-4">
          {row1.map((tile) => (
            <CategoryTile
              key={tile.key}
              label={tile.label.toUpperCase()}
              href={tile.link}
              image={tile.image}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 md:gap-4">
          {row2.map((tile) => (
            <CategoryTile
              key={tile.key}
              label={tile.label.toUpperCase()}
              href={tile.link}
              image={tile.image}
              className="col-span-1"
            />
          ))}
        </div>
      </section>

      {/* New arrivals */}
      {isVisible('new-arrivals') && newArrivalProducts.length > 0 && (
        <section className="py-16 md:py-24 px-4 md:px-6 max-w-7xl mx-auto">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#6B6B6B] mb-2">NEW IN</p>
          <h2 className="font-cormorant font-light text-[36px] md:text-[48px] text-[#111] mb-10 md:mb-14">
            Fresh Off The Rail
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {newArrivalProducts.map((product: any) => (
              <PremiumProductCard key={productListKey(product)} product={product} forceNewBadge />
            ))}
          </div>
          <div className="text-center mt-12">
            <Link
              href="/products?newArrival=true"
              className="inline-block border border-[#111] text-[#111] text-[11px] uppercase tracking-[0.2em] px-10 py-4 hover:bg-[#111] hover:text-white transition-colors"
            >
              VIEW ALL NEW ARRIVALS
            </Link>
          </div>
        </section>
      )}

      {/* Brand story */}
      <section className="grid grid-cols-1 lg:grid-cols-2 min-h-[480px]">
        <div className="relative aspect-[4/5] lg:aspect-auto min-h-[320px]">
          <Image
            src={p.brandStoryImage || ''}
            alt="Brand editorial"
            fill
            className="object-cover"
            sizes="50vw"
          />
        </div>
        <div className="flex flex-col justify-center px-8 md:px-16 py-16 bg-white">
          <p className="text-[11px] uppercase tracking-[0.25em] text-[#6B6B6B] mb-4">OUR PHILOSOPHY</p>
          <h2 className="font-cormorant font-light text-[36px] md:text-[52px] text-[#111] leading-tight mb-6">
            Boring Is Never An Option
          </h2>
          <p className="text-[#6B6B6B] text-sm md:text-base leading-relaxed max-w-md mb-8">
            We believe in refined essentials — premium fabrics, precise tailoring, and designs that transcend seasons.
            Less noise, more intention.
          </p>
          <Link href="/products" className="text-[11px] uppercase tracking-[0.2em] text-[#111] premium-link inline-block w-fit">
            ABOUT US →
          </Link>
        </div>
      </section>

      {/* Bestsellers */}
      <section className="py-16 md:py-24 bg-[#F5F5F3] px-4 md:px-6">
        <h2 className="text-center text-[11px] uppercase tracking-[0.25em] text-[#111] mb-8 font-medium">
          BESTSELLERS
        </h2>
        <div className="flex justify-center gap-6 md:gap-10 mb-10 text-[11px] uppercase tracking-[0.15em]">
          {([
            ['week', 'THIS WEEK'],
            ['month', 'THIS MONTH'],
            ['all', 'ALL TIME'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setBestsellerTab(key)}
              className={cn(
                'pb-1 transition-colors',
                bestsellerTab === key
                  ? 'text-[#111] border-b border-[#111]'
                  : 'text-[#6B6B6B] hover:text-[#111]'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="max-w-7xl mx-auto overflow-x-auto no-scrollbar snap-x snap-mandatory flex gap-4 md:gap-8 pb-4">
          {(bestsellers.length ? bestsellers : products.slice(0, 8)).map((product: any) => (
            <div key={productListKey(product)} className="w-[45vw] sm:w-[240px] shrink-0 snap-start">
              <PremiumProductCard product={product} />
            </div>
          ))}
        </div>
      </section>

      {/* Sale banner */}
      {(isVisible('combo-offers') || catalogueActiveOffers.length > 0 || saleProducts.length > 0) && (
        <section className="bg-[#111111] text-white py-16 md:py-20 px-4 md:px-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="font-cormorant font-light text-[64px] md:text-[96px] leading-none mb-6">
                {p.promoBannerText || 'UP TO 50% OFF'}
              </p>
              <Link
                href="/offers"
                className="inline-block border border-white text-white text-[11px] uppercase tracking-[0.2em] px-10 py-4 hover:bg-white hover:text-[#111] transition-colors"
              >
                SHOP SALE
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              {(saleProducts.length ? saleProducts : products.slice(0, 4)).map((product: any, i: number) => (
                <Link
                  key={product._id || i}
                  href={`/products/${product.slug}`}
                  className="relative aspect-square bg-[#222] overflow-hidden group"
                >
                  <Image
                    src={product.images?.[0] || p.heroDesktop || DEFAULT_HOMEPAGE3_PLACEHOLDERS.heroDesktop!}
                    alt={product.name}
                    fill
                    className="object-cover opacity-90 group-hover:scale-[1.03] transition-transform duration-500"
                    sizes="25vw"
                  />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="py-16 md:py-24 px-4 md:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
          {REVIEWS.map((r) => (
            <div key={r.name} className="border border-[#E8E4DF] p-8 bg-white">
              <div className="flex gap-0.5 mb-4 text-[#111]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width={14} height={14} viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-[#111] leading-relaxed mb-6">&ldquo;{r.quote}&rdquo;</p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-[0.15em] font-medium">{r.name}</span>
                {r.verified && (
                  <span className="text-[10px] uppercase tracking-wider text-[#6B6B6B] border border-[#E8E4DF] px-1.5 py-0.5">
                    Verified
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-center mt-12 text-sm text-[#6B6B6B]">
          <span className="text-[#111] font-medium">4.8 / 5</span> from 2,400+ reviews
        </p>
      </section>

      {/* Instagram */}
      <section className="py-16 md:py-24 px-4 md:px-6 max-w-7xl mx-auto">
        <p className="text-[11px] uppercase tracking-[0.25em] text-[#6B6B6B] text-center mb-2">STYLE INSPIRATION</p>
        <h2 className="font-cormorant font-light text-[32px] md:text-[40px] text-center text-[#111] mb-10">
          {settings?.instagramHandle || '@SOWAATMENSWEAR'}
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-1 md:gap-2">
          {instagramImages.map((src, i) => (
            <a
              key={i}
              href="#"
              className="relative aspect-square overflow-hidden group bg-[#F5F5F3]"
            >
              <Image src={src} alt="" fill className="object-cover" sizes="20vw" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <svg
                  className="opacity-0 group-hover:opacity-100 text-white transition-opacity"
                  width={28}
                  height={28}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="2" y="2" width="20" height="20" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              </div>
            </a>
          ))}
        </div>
        <p className="text-center mt-8">
          <a href="#" className="text-[11px] uppercase tracking-[0.2em] text-[#111] premium-link">
            FOLLOW US ON INSTAGRAM
          </a>
        </p>
      </section>

      {/* Newsletter */}
      <section className="relative py-20 md:py-28 px-4 md:px-6 overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${p.newsletterBg || DEFAULT_HOMEPAGE3_PLACEHOLDERS.newsletterBg}')`,
          }}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 max-w-xl mx-auto text-center text-white">
          <h2 className="font-cormorant font-light text-[36px] md:text-[48px] mb-4">JOIN THE INNER CIRCLE</h2>
          <p className="text-white/80 text-sm mb-8 leading-relaxed">
            Get early access to drops, exclusive offers & style edits.
          </p>
          {subscribed ? (
            <p className="text-sm uppercase tracking-widest">Thank you for subscribing.</p>
          ) : (
            <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-0 max-w-md mx-auto">
              <input
                type="email"
                required
                placeholder="Your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-4 text-[#111] text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="bg-white text-[#111] text-[11px] uppercase tracking-[0.2em] px-8 py-4 font-semibold hover:bg-white/90"
              >
                SUBSCRIBE
              </button>
            </form>
          )}
          <p className="text-[10px] text-white/50 mt-4 uppercase tracking-wider">No spam. Unsubscribe anytime.</p>
        </div>
      </section>

      <PremiumFooter instagramHandle={settings?.instagramHandle} />
    </div>
  );
}
