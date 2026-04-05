import Image from 'next/image';
import Link from 'next/link';

interface ComboOfferBannerProps {
  title: string;
  description: string;
  image?: string;
  ctaText?: string;
  ctaLink?: string;
  /** When set, the whole banner is one link (no nested anchors). CTA is visual only. */
  href?: string;
  variant?: 'light' | 'dark';
}

export default function ComboOfferBanner({
  title,
  description,
  image,
  ctaText = 'SHOP NOW',
  ctaLink = '/offers',
  href,
  variant = 'light',
}: ComboOfferBannerProps) {
  const isDark = variant === 'dark';

  const ctaClass = 'btn-gold mt-8 rounded inline-block text-center';

  const body = (
    <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
      <div className="flex-1 text-center md:text-left">
        <h2 className={`text-3xl md:text-5xl font-bold leading-tight ${isDark ? 'text-white' : 'text-[var(--text-primary)]'}`}>
          {title}
        </h2>
        <p className={`mt-4 text-base md:text-lg ${isDark ? 'text-gray-400' : 'text-[var(--text-secondary)]'}`}>
          {description}
        </p>
        {href ? (
          <span className={ctaClass}>{ctaText}</span>
        ) : (
          <Link href={ctaLink} className={ctaClass}>
            {ctaText}
          </Link>
        )}
      </div>

      <div className="flex-1 w-full max-w-md">
        <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-[var(--gold-light)] to-[var(--gold)]">
          {image ? (
            <Image src={image} alt={title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-2">🛍️</div>
                <p className="text-sm font-semibold text-[var(--navbar-bg)] opacity-60">Combo Offer</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <section className={`w-full ${isDark ? 'bg-[var(--navbar-bg)]' : 'bg-[var(--surface)]'}`}>
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-20">
        {href ? (
          <Link href={href} className="block rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]">
            {body}
          </Link>
        ) : (
          body
        )}
      </div>
    </section>
  );
}
