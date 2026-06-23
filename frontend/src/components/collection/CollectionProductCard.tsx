'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/lib/cart-store';
import { useAuthStore } from '@/lib/auth-store';
import { formatPrice, formatPriceRange, calculateDiscount } from '@/lib/utils';
import { cn } from '@/lib/utils';
import ProductCardSizePicker from '@/components/shared/ProductCardSizePicker';

const SWATCHES = ['#111111', '#6B6B6B', '#8B7355', '#1E3A5F'];

type Props = { product: any; listView?: boolean };

export default function CollectionProductCard({ product, listView }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const { wishlist, toggleWishlist, isLoggedIn, openAuthModal } = useAuthStore();
  const wishlisted = useMemo(() => wishlist.includes(product._id), [wishlist, product._id]);
  const [hovered, setHovered] = useState(false);

  const discount = calculateDiscount(product.price, product.discountPrice);
  const onSale = product.discountPrice && product.discountPrice < product.price;
  const imageUrl = product.images?.[0] || '/placeholder.jpg';
  const sizes: string[] = product.sizes?.length ? product.sizes : ['S', 'M', 'L', 'XL'];
  const sizeVariants = product.sizeVariants || [];
  const hasSizeLinks = sizeVariants.length > 0;

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
      if (wishlisted) await fetch(`${url}/api/users/wishlist/${product._id}`, { method: 'DELETE' });
      else {
        await fetch(`${url}/api/users/wishlist`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product._id }),
        });
      }
    } catch { /* ignore */ }
  };

  const quickAdd = (e: React.MouseEvent, size: string) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product._id,
      name: product.name,
      image: imageUrl,
      size,
      price: product.price,
      discountPrice: product.discountPrice,
    });
  };

  const badge = product.isNewArrival ? 'NEW' : discount >= 50 ? `${discount}% OFF` : discount > 0 ? `${discount}% OFF` : null;

  return (
    <Link
      href={`/products/${product.slug}`}
      className={cn('group block', listView && 'flex gap-4 border border-[#E8E4DF] p-3')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={cn('relative overflow-hidden bg-[#F5F5F3]', listView ? 'w-28 shrink-0 aspect-[3/4]' : 'aspect-[3/4] w-full')}>
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          sizes={listView ? '120px' : '(max-width:768px) 50vw, 25vw'}
        />
        {product.images?.[1] && (
          <Image
            src={product.images[1]}
            alt=""
            fill
            className={cn(
              'object-cover transition-opacity duration-300 group-hover:scale-[1.04]',
              hovered ? 'opacity-100' : 'opacity-0'
            )}
            sizes={listView ? '120px' : '(max-width:768px) 50vw, 25vw'}
          />
        )}
        {badge && (
          <span className="absolute top-2 left-2 z-10 bg-[#111] text-white text-[10px] uppercase tracking-wider px-2 py-0.5">
            {badge}
          </span>
        )}
        <button
          type="button"
          onClick={handleWishlist}
          className={cn(
            'absolute top-2 right-2 z-20 w-8 h-8 bg-white/95 flex items-center justify-center',
            'md:opacity-0 md:group-hover:opacity-100 transition-opacity',
            wishlisted && 'opacity-100'
          )}
          aria-label="Wishlist"
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill={wishlisted ? '#111' : 'none'} stroke="#111" strokeWidth="1.5">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 bg-white/95 px-2 py-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20',
            'hidden md:block'
          )}
        >
          <p className="text-[9px] uppercase tracking-widest text-[#999] mb-1.5 text-center">
            {hasSizeLinks ? 'Select Size' : 'Quick Add'}
          </p>
          {hasSizeLinks ? (
            <ProductCardSizePicker
              sizeVariants={sizeVariants}
              variant="inline"
              className="justify-center"
            />
          ) : (
            <div className="flex flex-wrap justify-center gap-1">
              {sizes.slice(0, 6).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={(e) => quickAdd(e, sz)}
                  className="min-w-[28px] h-7 text-[10px] border border-[#E8E4DF] hover:bg-[#111] hover:text-white hover:border-[#111] transition-colors"
                >
                  {sz}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className={cn('pt-3', listView && 'pt-0 flex-1 min-w-0')}>
        <p className="text-[12px] uppercase tracking-[0.12em] text-[#111] truncate">{product.name}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-sm font-semibold text-[#111]">
            {formatPriceRange(
              onSale ? product.discountPrice : product.price,
              product.priceMax
            )}
          </span>
          {onSale && (
            <span className="text-xs text-[#999] line-through">
              {formatPriceRange(product.price, product.priceMax)}
            </span>
          )}
        </div>
        {(hasSizeLinks || sizes.length > 0) && (
          <div className="mt-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
            <ProductCardSizePicker
              sizeVariants={hasSizeLinks ? sizeVariants : undefined}
              sizes={hasSizeLinks ? undefined : sizes.slice(0, 6)}
              productSlug={product.slug}
              variant="inline"
            />
          </div>
        )}
        {discount > 0 && (
          <p className="text-[11px] text-[#C0392B] mt-0.5">{discount}% off</p>
        )}
        <div className="flex gap-1 mt-2">
          {SWATCHES.map((c) => (
            <span key={c} className="w-2.5 h-2.5 border border-[#E8E4DF]" style={{ backgroundColor: c }} />
          ))}
        </div>
      </div>
    </Link>
  );
}
