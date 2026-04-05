'use client';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/shared/ProductCard';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

function MagazineBentoCard({ product, className, type = 'small' }: any) {
  const [isHovered, setIsHovered] = useState(false);
  if (!product) return null;
  const isMain = type === 'main';

  return (
    <div 
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      <Link href={`/products/${product.slug}`} className="absolute inset-0 bg-[var(--surface)] hover-zoom overflow-hidden">
        <Image src={product.images?.[0] || '/placeholder.jpg'} alt={product.name} fill className="object-cover" sizes={isMain ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 50vw, 25vw"} />
        {product.images?.[1] && (
          <Image
            src={product.images[1]}
            alt={product.name}
            fill
            className={`object-cover transition-opacity duration-300 ${isHovered ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
            sizes={isMain ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 768px) 50vw, 25vw"}
          />
        )}
        <div className={`absolute inset-x-0 bottom-0 ${isMain ? 'p-6' : 'p-4'} bg-gradient-to-t from-black/80 to-transparent text-white ${isMain ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity z-20'}`}>
          <h3 className={isMain ? "text-2xl font-playfair mb-1" : "text-sm font-medium"}>{product.name}</h3>
          {isMain && <p className="font-bold">₹{product.discountPrice || product.price}</p>}
        </div>
      </Link>
    </div>
  );
}

function MagazineFlashCard({ product }: any) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div className="w-[200px] shrink-0 md:w-auto bg-white/5 p-4 rounded-xl border border-white/10 hover:border-[var(--gold)]/50 transition-colors text-left backdrop-blur-sm">
      <div 
        className="aspect-[4/5] relative rounded mb-4 overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => setIsHovered(false)}
      >
        <Image src={product.images?.[0] || '/placeholder.jpg'} alt={product.name} fill className="object-cover" />
        {product.images?.[1] && (
          <Image
            src={product.images[1]}
            alt={product.name}
            fill
            className={`object-cover transition-opacity duration-300 ${isHovered ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          />
        )}
        <span className="absolute top-2 left-2 bg-[var(--sale-red)] text-white text-xs font-bold px-2 py-1 rounded z-20">SALE</span>
      </div>
      <h3 className="font-playfair text-[15px] md:text-lg mb-2 truncate">{product.name}</h3>
      <div className="flex justify-between items-center">
        <div>
          <span className="text-[var(--gold)] font-bold text-base md:text-lg">₹{product.discountPrice || product.price}</span>
          {product.discountPrice > 0 && <span className="text-[10px] md:text-xs text-white/50 line-through ml-1 md:ml-2">₹{product.price}</span>}
        </div>
        <Link href={`/products/${product.slug}`} className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:bg-[var(--gold)] transition-colors shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </Link>
      </div>
    </div>
  );
}

function MagazineCuratedCard({ product }: any) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div className="py-6 flex items-center gap-6 group">
      <div 
        className="w-16 h-20 relative shrink-0 bg-gray-100"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => setIsHovered(false)}
      >
        <Image src={product.images?.[0] || '/placeholder.jpg'} alt={product.name} fill className="object-cover" />
        {product.images?.[1] && (
          <Image
            src={product.images[1]}
            alt={product.name}
            fill
            className={`object-cover transition-opacity duration-300 ${isHovered ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
          />
        )}
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-lg group-hover:text-[var(--gold)] transition-colors">{product.name}</h3>
        <p className="text-[var(--text-secondary)] text-sm">{product.category.toUpperCase()}</p>
      </div>
      <div className="text-right">
        <p className="font-bold">₹{product.discountPrice || product.price}</p>
        <Link href={`/products/${product.slug}`} className="text-xs font-bold tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1 mt-1 text-[var(--gold)]">
          BUY <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </Link>
      </div>
    </div>
  );
}

export default function MagazineHome({ products, offers, settings }: any) {
  const featuredProducts = products?.filter((p: any) => p.isFeatured).slice(0, 5) || [];
  const activeOffers = offers || [];
  const flashSale = activeOffers.find((o: any) => o.type === 'flash');
  const p = settings?.placeholders?.magazine || {};

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans selection:bg-black selection:text-white">
      {/* 1. Minimal Navbar */}
      <Navbar variant="minimal" />

      {/* 2. Split Hero */}
      <section className="h-screen flex flex-col md:flex-row pt-[72px] md:pt-0">
        <div className="w-full md:w-[55%] h-[50vh] md:h-full relative overflow-hidden bg-zinc-100">
          <div 
            className="absolute inset-0 bg-cover bg-center mix-blend-multiply" 
            style={{ backgroundImage: `url('${p.heroImage || "https://res.cloudinary.com/demo/image/upload/w_1200,h_1600,c_fill/v1/samples/ecommerce/leather-bag-gray.jpg"}')` }} 
          />
          {/* Grain overlay */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
        </div>
        
        <div className="w-full md:w-[45%] h-[50vh] md:h-full flex flex-col justify-center px-8 md:px-16 relative">
          <h2 className="text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase mb-8 opacity-60">Spring / Summer 2026</h2>
          
          <h1 className="text-[32px] md:text-7xl font-bold font-playfair leading-[1.1] tracking-tight mb-8 relative">
            <span className="block animate-slide-up">DRESS</span>
            <span className="block animate-slide-up" style={{ animationDelay: '0.1s' }}>LIKE</span>
            <span className="block animate-slide-up relative inline-block" style={{ animationDelay: '0.2s' }}>
              YOU MEAN IT
              <span className="absolute -bottom-2 left-0 right-0 h-1 bg-[var(--gold)]/80 scale-x-0 origin-left animate-[scaleX_1s_ease-out_forwards] delay-500" />
            </span>
          </h1>

          <div className="mt-6 md:mt-24 w-full animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <Link href="/products" className="block md:hidden mb-6">
              <button className="w-full bg-black text-[var(--gold)] font-bold text-sm h-[48px] uppercase tracking-wider">Explore Collection</button>
            </Link>
            <div className="hidden md:block space-y-4">
              {featuredProducts.slice(0, 2).map((product: any) => (
                <ProductCard key={product._id} product={product} variant="wide" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Scrolling Marquee */}
      <section className="bg-black text-[var(--gold)] py-6 overflow-hidden border-y-8 border-white">
        <div className="animate-marquee-fast whitespace-nowrap flex font-bold tracking-[0.2em] text-2xl md:text-4xl uppercase">
          <span className="mx-8">• NEW ARRIVALS</span>
          <span className="mx-8">• FLASH SALE</span>
          <span className="mx-8">• COMBO OFFERS</span>
          <span className="mx-8">• PREMIUM MENSWEAR</span>
          <span className="mx-8">• SOWAAT</span>
          <span className="mx-8">• NEW ARRIVALS</span>
          <span className="mx-8">• FLASH SALE</span>
          <span className="mx-8">• COMBO OFFERS</span>
        </div>
      </section>

      {/* 4. Bento Grid Showcase */}
      <section className="px-4 py-20 max-w-[1400px] mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 px-4">
          <h2 className="text-4xl md:text-6xl font-playfair font-bold leading-tight max-w-md">
            THE <br/><span className="text-[var(--gold)] italic">EDIT</span>
          </h2>
          <Link href="/products" className="text-sm font-bold tracking-[0.2em] uppercase hover:text-[var(--gold)] transition-colors border-b-2 border-black hover:border-[var(--gold)] pb-1 mt-6 md:mt-0">
            View All Pieces
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
          {/* Main Large */}
          {featuredProducts[0] && <MagazineBentoCard product={featuredProducts[0]} type="main" className="col-span-2 md:row-span-2 relative aspect-[3/4] md:aspect-auto group border border-[var(--border)]" />}
          
          {/* Small 1-4 */}
          {featuredProducts[1] && <MagazineBentoCard product={featuredProducts[1]} className="relative aspect-square group border border-[var(--border)]" />}
          {featuredProducts[2] && <MagazineBentoCard product={featuredProducts[2]} className="relative aspect-square group border border-[var(--border)]" />}
          {featuredProducts[3] && <MagazineBentoCard product={featuredProducts[3]} className="relative aspect-square group border border-[var(--border)]" />}
          {featuredProducts[4] && <MagazineBentoCard product={featuredProducts[4]} className="relative aspect-square group border border-[var(--border)]" />}
        </div>
      </section>

      {/* 5. Dark Full Bleed Banner */}
      {flashSale && (
        <section className="bg-[#111111] py-20 px-4 text-center text-white relative overflow-hidden">
          <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[140%] bg-[var(--gold)]/10 blur-[120px] rounded-full pointer-events-none" />
          
          <h2 className="text-xl md:text-2xl font-bold tracking-[0.4em] uppercase mb-12 text-[var(--gold)]">
            Time is Running Out
          </h2>
          
          <div className="flex justify-center mb-16 scale-125 md:scale-150 transform origin-center">
            <div className="font-mono font-bold tracking-tighter text-[var(--gold)] tabular-nums">
              <span className="text-[48px] md:text-9xl mx-1">12</span>
              <span className="text-[32px] md:text-7xl mx-1 opacity-50 relative bottom-1 md:bottom-2">:</span>
              <span className="text-[48px] md:text-9xl mx-1">45</span>
              <span className="text-[32px] md:text-7xl mx-1 opacity-50 relative bottom-1 md:bottom-2">:</span>
              <span className="text-[48px] md:text-9xl mx-1">00</span>
            </div>
          </div>

          <div className="max-w-5xl mx-auto flex overflow-x-auto no-scrollbar md:grid md:grid-cols-3 gap-4 md:gap-6 relative z-10 px-4 pb-4 -mx-4 md:mx-auto">
            {(flashSale.products || featuredProducts).slice(0, 3).map((product: any) => (
              <MagazineFlashCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 6. Two-Column Feature */}
      <section className="max-w-[1400px] mx-auto w-full px-4 py-20 md:py-32 flex flex-col md:flex-row gap-16 items-center">
        <div className="w-full md:w-1/2 relative">
          {/* Decorative corner accent */}
          <div className="absolute -top-4 -left-4 w-24 h-24 border-t-4 border-l-4 border-[var(--gold)] z-0" />
          <div className="absolute -bottom-4 -right-4 w-24 h-24 border-b-4 border-r-4 border-[var(--gold)] z-0" />
          
          <div className="aspect-[3/4] relative z-10 bg-gray-100">
            <Image 
              src={p.curatedStaplesImage || "https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/accessories-bag.jpg"} 
              alt="Editorial" fill className="object-cover grayscale hover:grayscale-0 transition-all duration-700" 
            />
          </div>
        </div>

        <div className="w-full md:w-1/2">
          <h2 className="text-3xl md:text-5xl font-playfair font-bold mb-10">Curated Staples</h2>
          <div className="divide-y divide-[var(--border)]">
            {products?.slice(0, 4).map((product: any) => (
              <MagazineCuratedCard key={product._id} product={product} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
