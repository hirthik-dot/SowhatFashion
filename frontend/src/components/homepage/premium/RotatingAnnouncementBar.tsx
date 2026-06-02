'use client';

const MESSAGES = [
  'FREE SHIPPING ON ORDERS ABOVE ₹999',
  'NEW ARRIVALS: SUMMER COLLECTION 2025',
  'EASY 30-DAY RETURNS',
];

export default function RotatingAnnouncementBar({ customText }: { customText?: string }) {
  if (customText) {
    return (
      <div className="bg-[#111111] text-white h-[32px] flex items-center justify-center overflow-hidden">
        <p className="text-[11px] uppercase tracking-[0.2em] font-medium px-4 text-center truncate">
          {customText}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#111111] text-white h-[32px] flex items-center justify-center overflow-hidden relative">
      <div className="announcement-rotate relative w-full h-full flex items-center justify-center">
        {MESSAGES.map((msg) => (
          <span key={msg} className="text-[11px] uppercase tracking-[0.2em] font-medium px-4">
            {msg}
          </span>
        ))}
      </div>
    </div>
  );
}
