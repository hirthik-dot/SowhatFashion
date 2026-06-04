'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  isAutoplayVideoUrl,
  resolveShopNowHref,
  type HeroMediaType,
} from '@/lib/hero-media';

type CatalogueHeroProps = {
  settings?: {
    heroMediaType?: HeroMediaType;
    heroVideoUrl?: string;
    heroLinkedProductId?: string;
    heroLinkedProductSlug?: string;
  } | null;
  products: { _id?: string; slug?: string }[];
  heroSlides: string[];
  heroMobileSrc: string;
  heroAlt: string;
};

function HeroCopy({ shopNowHref }: { shopNowHref: string }) {
  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.25em] text-white/80 mb-3 md:mb-4">NEW SEASON</p>
      <h1 className="font-cormorant font-light text-white text-[40px] md:text-[72px] leading-[1.05] tracking-wide mb-4 md:mb-6 max-w-3xl mx-auto md:mx-0">
        CRAFTED FOR THE MODERN MAN
      </h1>
      <p className="text-white/75 text-sm md:text-base max-w-md mb-8 md:mb-10 mx-auto md:mx-0 leading-relaxed">
        Minimalist silhouettes. Premium fabrics. Timeless style.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center md:justify-start">
        <Link
          href={shopNowHref}
          className="bg-white text-[#111] text-[11px] uppercase tracking-[0.2em] px-8 py-4 text-center font-semibold hover:bg-white/90 transition-colors"
        >
          SHOP NOW
        </Link>
        <Link
          href="/products?newArrival=true"
          className="border border-white text-white text-[11px] uppercase tracking-[0.2em] px-8 py-4 text-center font-semibold hover:bg-white/10 transition-colors"
        >
          EXPLORE COLLECTION
        </Link>
      </div>
    </>
  );
}

export default function CatalogueHero({
  settings,
  products,
  heroSlides,
  heroMobileSrc,
  heroAlt,
}: CatalogueHeroProps) {
  const heroMediaType: HeroMediaType =
    settings?.heroMediaType === 'video' ? 'video' : 'image';
  const heroVideoUrl = settings?.heroVideoUrl?.trim() || '';
  const shopNowHref = resolveShopNowHref(
    settings?.heroLinkedProductId,
    settings?.heroLinkedProductSlug,
    products
  );

  const useMp4Hero =
    heroMediaType === 'video' && Boolean(heroVideoUrl) && isAutoplayVideoUrl(heroVideoUrl);

  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    if (useMp4Hero || heroSlides.length <= 1) return;
    const t = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(t);
  }, [heroSlides.length, useMp4Hero]);

  return (
    <section className="relative h-[100svh] min-h-[560px] w-full overflow-hidden -mt-0">
      {useMp4Hero ? (
        <video
          className="absolute inset-0 w-full h-full object-cover z-0"
          src={heroVideoUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      ) : (
        heroSlides.map((src, i) => (
          <div
            key={src + i}
            className={cn(
              'absolute inset-0 transition-opacity duration-1000',
              i === heroIndex ? 'opacity-100 z-0' : 'opacity-0 z-0'
            )}
          >
            <Image
              src={i === 0 ? heroMobileSrc : src}
              alt={heroAlt}
              fill
              priority={i === 0}
              className={cn('object-cover md:hidden', i === heroIndex && 'animate-ken-burns')}
              sizes="100vw"
            />
            <Image
              src={src}
              alt={heroAlt}
              fill
              priority={i === 0}
              className={cn('object-cover hidden md:block', i === heroIndex && 'animate-ken-burns')}
              sizes="100vw"
            />
          </div>
        ))
      )}

      <div className="absolute inset-0 bg-black/45 z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent z-10 pointer-events-none" />

      <div className="absolute inset-0 z-20 flex flex-col justify-end px-6 md:px-12 pb-16 md:pb-24 max-w-7xl mx-auto w-full text-center md:text-left">
        <HeroCopy shopNowHref={shopNowHref} />
      </div>
    </section>
  );
}
