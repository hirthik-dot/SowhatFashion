'use client';

export default function AnnouncementBar({ text }: { text?: string }) {
  const defaultText = 'FREE DELIVERY ABOVE ₹999 • SALE UP TO 50% OFF • NEW ARRIVALS EVERY WEEK • PREMIUM MENSWEAR • 📦 MY ORDERS → /orders • ';
  const displayText = text || defaultText;

  return (
    <div className="bg-[var(--navbar-bg)] text-white h-[28px] overflow-hidden flex items-center">
      <div className="animate-marquee whitespace-nowrap flex items-center">
        <span className="text-[11px] md:text-xs tracking-widest uppercase mx-4">{displayText}</span>
        <span className="text-[11px] md:text-xs tracking-widest uppercase mx-4">{displayText}</span>
        <span className="text-[11px] md:text-xs tracking-widest uppercase mx-4">{displayText}</span>
        <span className="text-[11px] md:text-xs tracking-widest uppercase mx-4">{displayText}</span>
      </div>
    </div>
  );
}
