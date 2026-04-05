'use client';

import { useEffect, useState } from 'react';

interface FlashSaleCountdownProps {
  endTime: string | Date;
  variant?: 'gold' | 'dark' | 'large';
}

export default function FlashSaleCountdown({ endTime, variant = 'gold' }: FlashSaleCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const end = new Date(endTime).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setExpired(true);
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  if (expired) {
    return (
      <div className="text-center">
        <span className="text-[var(--sale-red)] font-semibold text-lg">SALE ENDED</span>
      </div>
    );
  }

  const boxClass = variant === 'dark'
    ? 'countdown-box-dark'
    : variant === 'large'
      ? 'countdown-box text-3xl min-w-[64px] py-3'
      : 'countdown-box';

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex items-center gap-2">
      {timeLeft.days > 0 && (
        <>
          <div className={boxClass}>
            <div>{pad(timeLeft.days)}</div>
            <div className="text-[10px] font-normal mt-1 uppercase tracking-wider opacity-70">Days</div>
          </div>
          <span className="text-[var(--gold)] text-xl font-bold">:</span>
        </>
      )}
      <div className={boxClass}>
        <div>{pad(timeLeft.hours)}</div>
        <div className="text-[10px] font-normal mt-1 uppercase tracking-wider opacity-70">Hrs</div>
      </div>
      <span className="text-[var(--gold)] text-xl font-bold">:</span>
      <div className={boxClass}>
        <div>{pad(timeLeft.minutes)}</div>
        <div className="text-[10px] font-normal mt-1 uppercase tracking-wider opacity-70">Min</div>
      </div>
      <span className="text-[var(--gold)] text-xl font-bold">:</span>
      <div className={boxClass}>
        <div>{pad(timeLeft.seconds)}</div>
        <div className="text-[10px] font-normal mt-1 uppercase tracking-wider opacity-70">Sec</div>
      </div>
    </div>
  );
}
