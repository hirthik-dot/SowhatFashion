import AnnouncementBar from '@/components/layout/AnnouncementBar';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/shared/ProductCard';
import ComboOfferBanner from '@/components/shared/ComboOfferBanner';
import FlashSaleCountdown from '@/components/shared/FlashSaleCountdown';
import Link from 'next/link';

export default function AllenSollyHome({ products, offers, settings }: any) {
  const featuredProducts = products?.filter((p: any) => p.isFeatured).slice(0, 4) || [];
  const newArrivals = products?.filter((p: any) => p.isNewArrival) || [];
  const activeOffers = offers || [];
  const flashSale = activeOffers.find((o: any) => o.type === 'flash') || activeOffers[0];
  const comboOffer = activeOffers.find((o: any) => o.type === 'combo') || activeOffers[1];
  const p = settings?.placeholders?.allensolly || {};

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] font-sans">
      {/* 1. AnnouncementBar */}
      <AnnouncementBar text={settings?.announcementText} />

      {/* 2. Navbar */}
      <Navbar variant="default" />

      {/* 3. Hero Banner */}
      <section className="relative w-full h-[70vh] md:h-[80vh] bg-neutral-900 flex items-center justify-center overflow-hidden">
        {/* Placeholder gradient/image */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/40 z-10" />
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-60" 
          style={{ backgroundImage: `url('${p.heroImage || "https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/accessories-bag.jpg"}')` }} 
        />
        
        <div className="relative z-20 text-center w-full max-w-3xl px-4 md:px-6 mt-10 md:mt-0">
          <h2 className="text-white text-[28px] md:text-7xl font-bold mb-4 md:mb-6 tracking-wider font-playfair animate-slide-up">
            STYLE THAT SPEAKS
          </h2>
          <p className="text-gray-200 text-[13px] md:text-lg mb-8 md:mb-10 max-w-xl mx-auto animate-slide-up leading-relaxed" style={{ animationDelay: '0.2s' }}>
            Discover our latest collection of premium menswear curated for the modern gentleman.
          </p>
          <div className="animate-slide-up w-full md:w-auto" style={{ animationDelay: '0.4s' }}>
            <Link href="/products" className="block w-full md:inline-block">
              <button className="btn-gold w-full md:w-auto h-[48px] md:h-auto md:px-10">SHOP NOW</button>
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Category Tiles */}
      <section className="py-12 md:py-20 px-4 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-3 gap-3 md:gap-6">
          <Link href="/products?category=tshirt" className="group flex flex-col">
            <div 
               className="relative h-[120px] md:h-auto md:aspect-[4/5] overflow-hidden rounded bg-[var(--surface)] hover-zoom bg-cover bg-center mb-2 md:mb-0"
               style={{ backgroundImage: p.categoryTshirt ? `url('${p.categoryTshirt}')` : undefined }}
            >
              <div className="absolute inset-0 bg-black/20 z-10 group-hover:bg-black/40 transition-all border-4 border-transparent group-hover:border-[var(--gold)]" />
              <div className="hidden md:flex absolute inset-0 items-center justify-center z-20">
                <h3 className={`text-3xl font-bold tracking-[0.15em] font-playfair uppercase ${p.categoryTshirt ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-black'}`}>T-Shirts</h3>
              </div>
            </div>
            <h3 className="md:hidden text-[11px] font-bold tracking-widest uppercase text-center text-[var(--text-primary)]">T-Shirts</h3>
          </Link>
          <Link href="/products?category=shirt" className="group flex flex-col">
            <div 
               className="relative h-[120px] md:h-auto md:aspect-[4/5] overflow-hidden rounded bg-[var(--surface)] hover-zoom bg-cover bg-center mb-2 md:mb-0"
               style={{ backgroundImage: p.categoryShirt ? `url('${p.categoryShirt}')` : undefined }}
            >
              <div className="absolute inset-0 bg-black/20 z-10 group-hover:bg-black/40 transition-all border-4 border-transparent group-hover:border-[var(--gold)]" />
              <div className="hidden md:flex absolute inset-0 items-center justify-center z-20">
                <h3 className={`text-3xl font-bold tracking-[0.15em] font-playfair uppercase ${p.categoryShirt ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-black'}`}>Shirts</h3>
              </div>
            </div>
            <h3 className="md:hidden text-[11px] font-bold tracking-widest uppercase text-center text-[var(--text-primary)]">Shirts</h3>
          </Link>
          <Link href="/products?category=pant" className="group flex flex-col">
            <div 
               className="relative h-[120px] md:h-auto md:aspect-[4/5] overflow-hidden rounded bg-[var(--surface)] hover-zoom bg-cover bg-center mb-2 md:mb-0"
               style={{ backgroundImage: p.categoryPant ? `url('${p.categoryPant}')` : undefined }}
            >
              <div className="absolute inset-0 bg-black/20 z-10 group-hover:bg-black/40 transition-all border-4 border-transparent group-hover:border-[var(--gold)]" />
              <div className="hidden md:flex absolute inset-0 items-center justify-center z-20">
                <h3 className={`text-3xl font-bold tracking-[0.15em] font-playfair uppercase ${p.categoryPant ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-black'}`}>Pants</h3>
              </div>
            </div>
            <h3 className="md:hidden text-[11px] font-bold tracking-widest uppercase text-center text-[var(--text-primary)]">Pants</h3>
          </Link>
        </div>
      </section>

      {/* 5. Flash Sale Strip */}
      {flashSale && (
        <section className="bg-[var(--navbar-bg)] w-full py-12 text-white">
          <div className="max-w-7xl mx-auto px-4 flex flex-col xl:flex-row gap-10 items-center">
            {/* Left Box */}
            <div className="w-full xl:w-1/3 text-center xl:text-left flex flex-col items-center xl:items-start shrink-0">
              <h3 className="text-[var(--gold)] text-3xl font-playfair font-bold mb-4 tracking-widest uppercase">
                Flash Sale
              </h3>
              <p className="text-gray-400 mb-6 max-w-sm">{flashSale.description}</p>
              <FlashSaleCountdown endTime={flashSale.endTime} variant="gold" />
            </div>
            
            {/* Right Horizontal Scroll */}
            <div className="w-full xl:w-2/3 overflow-x-auto no-scrollbar pb-4 -mx-4 px-4 xl:mx-0 xl:px-0">
              <div className="flex gap-4 md:gap-6 min-w-max">
                {(flashSale.products || featuredProducts).slice(0, 4).map((product: any) => (
                  <div key={product._id} className="w-[160px] md:w-[240px] shrink-0">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. Featured Products Grid */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 w-full text-center">
        <h2 className="text-3xl md:text-4xl font-playfair font-bold mb-12 tracking-wide uppercase">Featured Collection</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 text-left">
          {featuredProducts.map((product: any) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/products?featured=true">
            <button className="btn-gold-outline">View All Featured</button>
          </Link>
        </div>
      </section>

      {/* 7. Combo Offer Banner */}
      {comboOffer && (
        <ComboOfferBanner
          title={comboOffer.title}
          description={comboOffer.comboDetails || comboOffer.description}
          variant="light"
        />
      )}

      {/* 8. New Arrivals */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto w-full overflow-hidden">
        <div className="px-4 mb-10 flex justify-between items-end">
          <h2 className="text-3xl md:text-4xl font-playfair font-bold tracking-wide uppercase">New Arrivals</h2>
          <Link href="/products?newArrival=true" className="text-[var(--text-secondary)] hover:text-[var(--gold)] font-medium text-sm hidden md:block transition-colors">
            SHOP ALL NEW ARRIVALS &rarr;
          </Link>
        </div>
        
        <div className="overflow-x-auto no-scrollbar px-4 pb-8">
          <div className="flex gap-4 md:gap-6 min-w-max">
            {newArrivals.slice(0, 6).map((product: any) => (
              <div key={product._id} className="w-[160px] md:w-[280px] shrink-0">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Brand Strip */}
      <section className="bg-[var(--surface)] py-12 md:py-16 border-y border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
          <div className="flex flex-col items-center pt-8 md:pt-0">
            <svg className="w-10 h-10 mb-4 text-[var(--gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 17h4V5H2v12h3m15-4v4h-3m3-4l-4-4h-3M4 17a2 2 0 100 4 2 2 0 000-4zM19 17a2 2 0 100 4 2 2 0 000-4z"/></svg>
            <h4 className="font-bold tracking-widest uppercase mb-2">Free Delivery</h4>
            <p className="text-[var(--text-secondary)] text-sm">On all orders above ₹{settings?.freeDeliveryAbove || 999}</p>
          </div>
          <div className="flex flex-col items-center pt-8 md:pt-0">
            <svg className="w-10 h-10 mb-4 text-[var(--gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 10V4c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v10a2 2 0 01-2 2H9l-4 4v-4H5a2 2 0 01-2-2zM8 10l4-4 4 4"/></svg>
            <h4 className="font-bold tracking-widest uppercase mb-2">Easy Returns</h4>
            <p className="text-[var(--text-secondary)] text-sm">7 days no hassle return policy</p>
          </div>
          <div className="flex flex-col items-center pt-8 md:pt-0">
            <svg className="w-10 h-10 mb-4 text-[var(--gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
            <h4 className="font-bold tracking-widest uppercase mb-2">Premium Quality</h4>
            <p className="text-[var(--text-secondary)] text-sm">Crafted with finest materials</p>
          </div>
        </div>
      </section>

      {/* 10. Instagram Strip */}
      <section className="py-16 md:py-24 overflow-hidden">
        <h2 className="text-center font-bold tracking-[0.2em] uppercase text-sm mb-10 text-[var(--text-secondary)]">
          FOLLOW US <span className="text-[var(--text-primary)]">{settings?.instagramHandle || '@SOWAATMENSWEAR'}</span>
        </h2>
        <div className="grid grid-cols-2 md:flex w-full">
          {[0,1,2,3,4,5].map((i) => {
            const defaultImage = "https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray.jpg";
            const bgImage = p.instagramImages?.[i] || p.instagramImages?.[0] || defaultImage;
            return (
              <div key={i} className="md:flex-1 w-full aspect-square relative hover-zoom bg-gray-100 border border-white">
                <div 
                  className="absolute inset-0 bg-cover bg-center grayscale hover:grayscale-0 transition-all duration-500" 
                  style={{ backgroundImage: `url('${bgImage}')` }}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* 11. Footer */}
      <Footer />
    </div>
  );
}
