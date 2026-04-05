'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils';

type Offer = {
  _id: string;
  slug: string;
  title: string;
  subtitle?: string;
  type?: string;
  carouselTemplate?: 'fullbleed' | 'splitcard' | 'spotlight';
  image?: string;
  backgroundImage?: string;
  accentColor?: string;
  discountPercent?: number;
  discountLabel?: string;
  ctaText?: string;
  endTime?: string | null;
  hasCountdown?: boolean;
  products?: Array<{ _id: string; images?: string[]; price?: number; discountPrice?: number; name?: string }>;
};

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function CountdownDark({ endTime, hasCountdown }: { endTime: string | null | undefined; hasCountdown?: boolean }) {
  const [tick, setTick] = useState(0);
  const end = endTime ? new Date(endTime).getTime() : null;

  useEffect(() => {
    if (!end || !hasCountdown) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [end, hasCountdown]);

  if (!end || !hasCountdown) return null;

  const ms = end - Date.now();
  void tick;
  if (ms <= 0) {
    return <span className="text-sm font-bold text-white/80 uppercase tracking-wider">Ended</span>;
  }
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);

  return (
    <div className="inline-flex gap-3 md:gap-4 items-start font-sans text-white">
      <div className="text-center">
        <div className="font-bold tabular-nums text-[22px] md:text-[32px]">{pad(h)}</div>
        <div className="text-[10px] uppercase text-white/60 tracking-wide">Hrs</div>
      </div>
      <span className="text-xl md:text-2xl font-light text-white/40 pt-1">:</span>
      <div className="text-center">
        <div className="font-bold tabular-nums text-[22px] md:text-[32px]">{pad(m)}</div>
        <div className="text-[10px] uppercase text-white/60 tracking-wide">Min</div>
      </div>
      <span className="text-xl md:text-2xl font-light text-white/40 pt-1">:</span>
      <div className="text-center">
        <div className="font-bold tabular-nums text-[22px] md:text-[32px]">{pad(s)}</div>
        <div className="text-[10px] uppercase text-white/60 tracking-wide">Sec</div>
      </div>
    </div>
  );
}

function CountdownGold({ endTime, hasCountdown }: { endTime: string | null | undefined; hasCountdown?: boolean }) {
  const [tick, setTick] = useState(0);
  const end = endTime ? new Date(endTime).getTime() : null;
  useEffect(() => {
    if (!end || !hasCountdown) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [end, hasCountdown]);
  if (!end || !hasCountdown) return null;
  const ms = end - Date.now();
  void tick;
  if (ms <= 0) return <span className="text-sm text-[var(--text-secondary)]">Ended</span>;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return (
    <span className="inline-flex items-center gap-2 font-sans text-[var(--gold)] font-bold text-xl md:text-2xl tabular-nums">
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  );
}

function discountLine(offer: Offer) {
  if (offer.discountLabel?.trim()) return offer.discountLabel;
  if (offer.discountPercent && offer.discountPercent > 0) return `${offer.discountPercent}% OFF`;
  return '';
}

function TemplateFullBleed({ offer }: { offer: Offer }) {
  const img = offer.image || offer.products?.[0]?.images?.[0] || '/placeholder.jpg';
  const gold = offer.accentColor || 'var(--gold)';
  return (
    <div className="relative w-full min-h-[320px] md:min-h-[520px] overflow-hidden bg-neutral-900">
      <Image src={img} alt="" fill className="object-cover" sizes="100vw" priority />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to right, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)',
        }}
      />
      <div className="absolute inset-0 flex flex-col justify-center px-6 md:pl-20 md:pr-12 z-10 text-white max-w-3xl">
        <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] mb-2 opacity-90" style={{ color: gold }}>
          Limited offer
        </div>
        <h2 className="font-playfair font-bold text-[26px] md:text-[56px] leading-[1.1]">{offer.title}</h2>
        <div className="h-1 w-10 bg-[var(--gold)] my-3 md:my-4" />
        {offer.subtitle && <p className="text-sm md:text-lg text-white/80 max-w-md mt-1">{offer.subtitle}</p>}
        {offer.hasCountdown && offer.endTime && (
          <div className="rounded-lg border border-white/20 bg-white/15 backdrop-blur-sm px-4 py-3 inline-flex flex-col gap-2 mt-4 md:mt-6">
            <span className="text-[10px] uppercase tracking-widest text-white/70">🕐 Ends in</span>
            <CountdownDark endTime={offer.endTime} hasCountdown={offer.hasCountdown} />
          </div>
        )}
        <Link
          href={`/offers/${offer.slug}`}
          className="mt-5 md:mt-6 inline-flex items-center justify-center md:justify-start font-bold uppercase text-sm tracking-wide px-8 py-3 bg-[var(--gold)] text-black hover:bg-[var(--gold-hover)] transition-colors w-full md:w-auto text-center"
          style={offer.accentColor ? { backgroundColor: offer.accentColor, color: '#111' } : undefined}
        >
          {offer.ctaText || 'SHOP NOW'} →
        </Link>
      </div>
    </div>
  );
}

function CountdownSplit({ endTime, hasCountdown }: { endTime?: string | null; hasCountdown?: boolean }) {
  const [tick, setTick] = useState(0);
  const end = endTime ? new Date(endTime).getTime() : null;
  useEffect(() => {
    if (!end || !hasCountdown) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [end, hasCountdown]);
  if (!end || !hasCountdown) return null;
  const ms = end - Date.now();
  void tick;
  if (ms <= 0) return <span className="text-sm text-[var(--text-secondary)]">Offer ended</span>;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return (
    <div className="flex items-end gap-2 font-sans">
      <span className="text-lg mr-1">🕐</span>
      <div>
        <span className="text-[#C9A84C] font-bold text-xl md:text-[28px] tabular-nums">{pad(h)}</span>
        <div className="text-[10px] uppercase text-[var(--text-secondary)] text-center">Hrs</div>
      </div>
      <span className="text-gray-400 pb-4">:</span>
      <div>
        <span className="text-[#C9A84C] font-bold text-xl md:text-[28px] tabular-nums">{pad(m)}</span>
        <div className="text-[10px] uppercase text-[var(--text-secondary)] text-center">Min</div>
      </div>
      <span className="text-gray-400 pb-4">:</span>
      <div>
        <span className="text-[#C9A84C] font-bold text-xl md:text-[28px] tabular-nums">{pad(s)}</span>
        <div className="text-[10px] uppercase text-[var(--text-secondary)] text-center">Sec</div>
      </div>
    </div>
  );
}

function TemplateSplitCard({ offer }: { offer: Offer }) {
  const img = offer.image || offer.products?.[0]?.images?.[0] || '/placeholder.jpg';
  const disc = discountLine(offer);
  return (
    <div className="relative w-full bg-[var(--surface)] md:min-h-[500px]">
      <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-[var(--gold)] z-10 hidden md:block pointer-events-none" />
      <div className="flex flex-col md:flex-row md:min-h-[500px]">
        <div className="order-2 md:order-1 w-full md:w-1/2 bg-white border-t-4 border-[var(--gold)] md:border-t-0 md:border-l-4 md:border-[var(--gold)] px-6 py-8 md:px-[60px] md:py-12 flex flex-col justify-center">
          <h2 className="font-playfair font-bold text-2xl md:text-[42px] text-[var(--text-primary)] leading-tight">{offer.title}</h2>
          <div className="w-10 h-0.5 bg-[var(--gold)] my-4" style={{ width: 40 }} />
          {offer.subtitle && <p className="text-[var(--text-secondary)] text-sm md:text-base">{offer.subtitle}</p>}
          {disc && (
            <div className="mt-4 inline-block bg-[var(--gold)] text-black font-bold text-base md:text-lg px-4 py-2 self-start">
              {disc}
            </div>
          )}
          <div className="mt-6">
            <CountdownSplit endTime={offer.endTime} hasCountdown={offer.hasCountdown} />
          </div>
          <Link
            href={`/offers/${offer.slug}`}
            className="mt-6 inline-flex items-center justify-center border-2 border-[var(--navbar-bg)] text-[var(--navbar-bg)] font-bold uppercase px-6 py-3 text-sm hover:bg-[var(--navbar-bg)] hover:text-white transition-colors w-full md:w-auto"
          >
            {offer.ctaText || 'EXPLORE NOW'} →
          </Link>
        </div>
        <div className="order-1 md:order-2 w-full md:w-1/2 relative min-h-[200px] md:min-h-0">
          <Image src={img} alt="" fill className="object-cover" sizes="(max-width:768px) 100vw, 50vw" />
        </div>
      </div>
    </div>
  );
}

function TemplateSpotlight({ offer }: { offer: Offer }) {
  const bg = offer.backgroundImage || offer.image || offer.products?.[0]?.images?.[0] || '/placeholder.jpg';
  const prods = (offer.products || []).slice(0, 3);
  while (prods.length < 3) {
    prods.push({ _id: `pad-${prods.length}`, images: [], price: 0 });
  }
  return (
    <div className="relative w-full min-h-[480px] md:min-h-[560px] overflow-hidden flex items-center justify-center py-10 px-4">
      <div className="absolute inset-0 scale-110">
        <Image src={bg} alt="" fill className="object-cover blur-md opacity-90" sizes="100vw" />
      </div>
      <div className="absolute inset-0 bg-black/55" />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl px-6 py-8 md:px-10 md:py-8 mx-auto">
        <p className="text-center text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">
          ✦ {offer.type === 'combo' ? 'COMBO OFFER' : 'SPECIAL OFFER'} ✦
        </p>
        <div className="h-px bg-[var(--border)] my-3" />
        <h2 className="font-playfair font-bold text-[28px] md:text-[38px] text-center text-[var(--text-primary)] leading-tight">
          {offer.title}
        </h2>
        {offer.subtitle && <p className="text-center text-[var(--text-secondary)] text-sm mt-2">{offer.subtitle}</p>}
        <div className="flex justify-center gap-2 md:gap-3 mt-6">
          {prods.slice(0, 3).map((p, i) => {
            const src = p.images?.[0] || '/placeholder.jpg';
            const price = p.discountPrice && p.discountPrice < (p.price || 0) ? p.discountPrice : p.price || 0;
            return (
              <div key={p._id || i} className="w-16 md:w-20 shrink-0 rounded-lg overflow-hidden border border-[var(--border)] bg-white">
                <div className="relative aspect-square w-full">
                  <Image src={src} alt="" fill className="object-cover" sizes="80px" />
                </div>
                <div className="text-[10px] md:text-xs font-bold text-center py-1 text-[var(--text-primary)]">
                  {price ? formatPrice(price) : '—'}
                </div>
              </div>
            );
          })}
        </div>
        {offer.hasCountdown && offer.endTime && (
          <div className="flex flex-col items-center gap-1 mt-5">
            <span className="text-xs text-[var(--text-secondary)] uppercase tracking-wider">🕐 Ends in</span>
            <CountdownGold endTime={offer.endTime} hasCountdown={offer.hasCountdown} />
          </div>
        )}
        <Link
          href={`/offers/${offer.slug}`}
          className="mt-6 block w-full text-center bg-[var(--gold)] text-black font-bold uppercase py-3 rounded-lg hover:bg-[var(--gold-hover)] transition-colors"
        >
          {offer.ctaText || 'GRAB THE DEAL'}
        </Link>
      </div>
    </div>
  );
}

function Slide({ offer }: { offer: Offer }) {
  const t = offer.carouselTemplate || 'fullbleed';
  if (t === 'splitcard') return <TemplateSplitCard offer={offer} />;
  if (t === 'spotlight') return <TemplateSpotlight offer={offer} />;
  return <TemplateFullBleed offer={offer} />;
}

export default function OfferCarousel({ offers }: { offers: Offer[] }) {
  const list = useMemo(() => offers.filter(Boolean), [offers]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);
  const n = list.length;

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => (i + dir + n) % n);
    },
    [n]
  );

  useEffect(() => {
    if (n <= 1 || paused) return;
    const id = setInterval(() => go(1), 5000);
    return () => clearInterval(id);
  }, [n, paused, go]);

  if (n === 0) return null;

  return (
    <section className="relative w-full bg-black group/carousel" aria-roledescription="carousel">
      <div
        className="overflow-hidden relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={(e) => {
          touchX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (dx > 50) go(-1);
          else if (dx < -50) go(1);
        }}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {list.map((offer) => (
            <div key={offer._id} className="min-w-full shrink-0">
              <Slide offer={offer} />
            </div>
          ))}
        </div>
      </div>

      {n > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(-1)}
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center bg-white/90 hover:bg-white text-black shadow-lg"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(1)}
            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 items-center justify-center bg-white/90 hover:bg-white text-black shadow-lg"
          >
            ›
          </button>
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
            {list.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`rounded-full transition-all h-3 w-3 md:h-3 md:w-3 ${i === index ? 'bg-[var(--gold)] scale-110' : 'bg-white/50 hover:bg-white/80'}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
