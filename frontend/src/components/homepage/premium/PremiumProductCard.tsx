'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/lib/auth-store';
import { formatPrice, calculateDiscount } from '@/lib/utils';

const SWATCH_COLORS = ['#111111', '#6B6B6B', '#8B7355', '#1E3A5F', '#FFFFFF'];

function swatchesForProduct(id: string) {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const count = 2 + (hash % 3);
  return SWATCH_COLORS.slice(hash % 2, hash % 2 + count);
}

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill={filled ? '#111' : 'none'} stroke="#111" strokeWidth="1.5">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

type Props = { product: any; forceNewBadge?: boolean };

export default function PremiumProductCard({ product, forceNewBadge }: Props) {
  const { wishlist, toggleWishlist, isLoggedIn, openAuthModal } = useAuthStore();
  const wishlisted = useMemo(() => wishlist.includes(product._id), [wishlist, product._id]);
  const [isHovered, setIsHovered] = useState(false);
  const swatches = useMemo(() => swatchesForProduct(product._id), [product._id]);

  const discount = calculateDiscount(product.price, product.discountPrice);
  const imageUrl = product.images?.[0] || '/placeholder.jpg';
  const showNew = forceNewBadge || product.isNewArrival;
  const salePrice = product.discountPrice && product.discountPrice < product.price;

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

  return (
    <Link
      href={`/products/${product.slug}`}
      className="block group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative aspect-[3/4] bg-[#F5F5F3] overflow-hidden">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        {product.images?.[1] && (
          <Image
            src={product.images[1]}
            alt=""
            fill
            className={`object-cover transition-all duration-500 group-hover:scale-[1.03] ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        )}
        {showNew && (
          <span className="absolute top-3 left-3 z-10 bg-white text-[#111] text-[10px] uppercase tracking-[0.15em] px-2 py-1">
            NEW
          </span>
        )}
        <button
          type="button"
          onClick={handleWishlist}
          className={`absolute top-3 right-3 z-10 w-8 h-8 bg-white/90 flex items-center justify-center transition-opacity md:opacity-0 group-hover:opacity-100 ${wishlisted ? 'opacity-100' : ''}`}
          aria-label="Add to wishlist"
        >
          <HeartIcon filled={wishlisted} />
        </button>
      </div>
      <div className="pt-4 space-y-2">
        <p className="text-[13px] uppercase tracking-[0.12em] text-[#111] font-medium truncate">
          {product.name}
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-[#111]">{formatPrice(salePrice ? product.discountPrice : product.price)}</span>
          {salePrice && (
            <span className="text-sm text-[#C0392B]/80 line-through">{formatPrice(product.price)}</span>
          )}
        </div>
        <div className="flex gap-1.5 pt-1">
          {swatches.map((color, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => e.preventDefault()}
              className="w-3 h-3 border border-[#E8E4DF]"
              style={{ backgroundColor: color }}
              aria-label={`Color option ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </Link>
  );
}
