'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/lib/cart-store';
import { useAuthStore } from '@/lib/auth-store';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { useState, useMemo } from 'react';

interface ProductCardProps {
  product: {
    _id: string;
    name: string;
    slug: string;
    images: string[];
    price: number;
    discountPrice: number;
    sizes: string[];
    isNewArrival: boolean;
    category: string;
  };
  variant?: 'default' | 'compact' | 'wide';
}

export default function ProductCard({ product, variant = 'default' }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const { wishlist, toggleWishlist, isLoggedIn, openAuthModal } = useAuthStore();
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || 'M');
  const [isHovered, setIsHovered] = useState(false);

  const discount = calculateDiscount(product.price, product.discountPrice);
  const hasDiscount = discount > 0;
  const imageUrl = product.images?.[0] || '/placeholder.jpg';
  
  const wishlisted = useMemo(() => wishlist.includes(product._id), [wishlist, product._id]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      productId: product._id,
      name: product.name,
      image: imageUrl,
      size: selectedSize,
      price: product.price,
      discountPrice: product.discountPrice,
    });
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isLoggedIn) {
       openAuthModal('login');
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
           body: JSON.stringify({ productId: product._id })
         });
      }
    } catch (err) {
      console.error('Failed to sync wishlist', err);
    }
  };
  if (variant === 'wide') {
    return (
      <Link href={`/products/${product.slug}`} className="block">
        <div className="flex gap-4 p-4 border border-[var(--border)] rounded-lg hover:border-[var(--gold)] transition-all group">
          <div className="w-20 h-24 relative flex-shrink-0 overflow-hidden rounded">
            <Image src={imageUrl} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="80px" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">{product.name}</h4>
            <div className="flex items-center gap-2 mt-1">
              {hasDiscount ? (
                <>
                  <span className="font-bold text-[var(--sale-red)]">{formatPrice(product.discountPrice)}</span>
                  <span className="text-xs text-[var(--text-secondary)] line-through">{formatPrice(product.price)}</span>
                </>
              ) : (
                <span className="font-bold">{formatPrice(product.price)}</span>
              )}
            </div>
          </div>
          <div className="flex items-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/products/${product.slug}`} className="block group">
      <div 
        className="product-card relative bg-white rounded-lg overflow-hidden border border-transparent hover:border-[var(--gold)] transition-all duration-300 hover:shadow-lg"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => setIsHovered(false)}
      >
        {/* Image */}
        <div className="relative aspect-square md:aspect-[3/4] overflow-hidden bg-[var(--surface)]">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          {product.images?.[1] && (
            <Image
              src={product.images[1]}
              alt={product.name}
              fill
              className={`object-cover group-hover:scale-105 transition-all duration-500 ease-in-out ${isHovered ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {hasDiscount && (
              <span className="bg-[var(--sale-red)] text-white text-[11px] font-bold px-2.5 py-1 rounded">
                {discount}% OFF
              </span>
            )}
            {product.isNewArrival && (
              <span className="bg-[var(--gold)] text-black text-[11px] font-bold px-2.5 py-1 rounded">
                NEW
              </span>
            )}
          </div>

          {/* Wishlist */}
          <button
            onClick={handleWishlist}
            className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all shadow-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={wishlisted ? 'var(--sale-red)' : 'none'} stroke={wishlisted ? 'var(--sale-red)' : 'currentColor'} strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>

          {/* Add to Cart Overlay Desktop */}
          <div className="product-card-overlay absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 hidden md:block opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex gap-1.5 mb-3">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedSize(size); }}
                  className={`text-[11px] px-2 py-1 rounded border min-w-[32px] min-h-[32px] ${
                    selectedSize === size
                      ? 'bg-[var(--gold)] border-[var(--gold)] text-black'
                      : 'border-white/40 text-white hover:border-white'
                  } transition-all`}
                >
                  {size}
                </button>
              ))}
            </div>
            <button
              onClick={handleAddToCart}
              className="w-full btn-gold text-sm py-2.5 rounded hover:bg-[var(--gold-hover)]"
            >
              ADD TO CART
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="text-sm font-medium text-[var(--text-primary)] truncate group-hover:text-[var(--gold)] transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center gap-2 mt-1.5">
            {hasDiscount ? (
              <>
                <span className="font-bold text-base">{formatPrice(product.discountPrice)}</span>
                <span className="text-xs text-[var(--text-secondary)] line-through">{formatPrice(product.price)}</span>
                <span className="text-xs text-[var(--sale-red)] font-semibold">({discount}% off)</span>
              </>
            ) : (
              <span className="font-bold text-base">{formatPrice(product.price)}</span>
            )}
          </div>
          
          {/* Mobile Actions: always visible Add to Cart below price */}
          <div className="md:hidden mt-3 pt-2 border-t border-[var(--border)]">
            <div className="flex flex-wrap gap-2 mb-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelectedSize(size); }}
                  className={`flex items-center justify-center text-[12px] font-medium min-w-[44px] h-[44px] rounded border ${
                    selectedSize === size
                      ? 'bg-[var(--gold)] border-[var(--gold)] text-black'
                      : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--text-primary)]'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
            <button
              onClick={handleAddToCart}
              className="w-full bg-[var(--gold)] text-black text-xs font-bold uppercase tracking-wider h-[44px] rounded hover:bg-[var(--gold-hover)] active:bg-[var(--gold)] transition-colors"
            >
              ADD TO CART
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
