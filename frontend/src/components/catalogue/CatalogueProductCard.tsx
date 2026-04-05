'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/lib/auth-store';
import { formatPrice, calculateDiscount } from '@/lib/utils';

const MaxWishlistIcon = ({ filled = false, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'var(--gold)' : 'none'} stroke={filled ? 'var(--gold)' : 'currentColor'} strokeWidth="1.5">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    {!filled && (
      <g strokeWidth="2">
        <line x1="12" y1="9" x2="12" y2="15" />
        <line x1="9" y1="12" x2="15" y2="12" />
      </g>
    )}
  </svg>
);

type Props = { product: any; forceNewBadge?: boolean };

export default function CatalogueProductCard({ product, forceNewBadge }: Props) {
  const { wishlist, toggleWishlist, isLoggedIn, openAuthModal } = useAuthStore();
  const wishlisted = useMemo(() => wishlist.includes(product._id), [wishlist, product._id]);
  const [isHovered, setIsHovered] = useState(false);

  const discount = calculateDiscount(product.price, product.discountPrice);
  const imageUrl = product.images?.[0] || '/placeholder.jpg';

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      openAuthModal();
      return;
    }
    toggleWishlist(product._id);
    try {
      const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      if (wishlisted) {
        await fetch(`${url}/api/users/wishlist/${product._id}`, { method: 'DELETE' });
      } else {
        await fetch(`${url}/api/users/wishlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product._id }),
        });
      }
    } catch {
      /* ignore */
    }
  };

  let offerText = '';
  if (product.categories?.includes('flash_sale')) offerText = 'FLASH SALE';
  else if (product.categories?.includes('combo')) offerText = 'COMBO OFFER';
  else if (discount > 0) offerText = `${discount}% OFF`;

  const showNew = forceNewBadge || product.isNewArrival;

  return (
    <Link href={`/products/${product.slug}`} className="block group font-sans">
      <div
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => setIsHovered(false)}
      >
        <div className="aspect-[4/5] bg-[var(--surface)] overflow-hidden relative">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
          {product.images?.[1] && (
            <Image
              src={product.images[1]}
              alt={product.name}
              fill
              className={`object-cover transition-all duration-300 group-hover:scale-[1.03] ${isHovered ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          )}
          {showNew && (
            <span className="absolute top-2 left-2 z-20 bg-[var(--gold)] text-black text-xs font-bold px-2 py-0.5 uppercase tracking-wide shadow-sm">
              NEW
            </span>
          )}
          <button
            type="button"
            onClick={handleWishlist}
            className={`absolute top-2 right-2 w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center transition-opacity md:opacity-0 group-hover:opacity-100 ${wishlisted ? 'opacity-100' : ''}`}
          >
            <MaxWishlistIcon filled={wishlisted} size={18} />
          </button>
          {offerText && (
            <div className="absolute bottom-2 left-2 flex flex-col gap-1">
              <span className="bg-white text-[var(--text-primary)] text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide self-start shadow-sm leading-tight">
                {offerText}
              </span>
            </div>
          )}
        </div>

        <div className="pt-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-semibold text-sm md:text-base text-[var(--text-primary)]">
              {formatPrice(product.discountPrice || product.price)}
            </span>
            {discount > 0 && (
              <span className="text-xs text-[var(--text-secondary)] line-through">{formatPrice(product.price)}</span>
            )}
          </div>
          <p className="text-xs md:text-sm text-[var(--text-secondary)] truncate">{product.name}</p>
        </div>
      </div>
    </Link>
  );
}
