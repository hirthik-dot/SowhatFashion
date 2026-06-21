'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useCartStore } from '@/lib/cart-store';
import { useAuthStore } from '@/lib/auth-store';
import { formatPrice, calculateDiscount } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import VariantThumbnailGrid from '@/components/shared/VariantThumbnailGrid';
import SizeVariantLinks from '@/components/shared/SizeVariantLinks';
import type { ProductVariantSummary } from '@/lib/product-variants';
import type { ProductSizeVariantSummary } from '@/lib/product-size-variants';
import { WHATSAPP_LINK } from '@/lib/contact';

export default function ProductDetailClient({ product }: { product: any }) {
  const sizes: string[] = product.sizes || [];
  const images: string[] = product.images || [];
  const price = Number.isFinite(Number(product.price)) ? Number(product.price) : 0;
  const discountPrice = Number.isFinite(Number(product.discountPrice)) ? Number(product.discountPrice) : 0;
  const stock = Number(product.stock) || 0;
  const productName = String(product.name || product.billingName || 'Product').trim() || 'Product';
  const variants: ProductVariantSummary[] = product.variants || [];
  const sizeVariants: ProductSizeVariantSummary[] = product.sizeVariants || [];
  const hasVariants = variants.length > 0;
  const hasSizeVariants = sizeVariants.length > 1;
  const isSizeVariantPage = Boolean(product.isSizeVariant);
  const currentSlug = product.slug || '';
  const description =
    product.description?.trim() ||
    `Premium quality ${product.category} crafted for maximum comfort and unparalleled style. Features our signature attention to detail and perfect fit. Tags: ${(product.tags || []).join(', ')}.`;

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(
    isSizeVariantPage ? (product.sizeName || sizes[0] || '') : (sizes[0] || '')
  );
  const [quantity, setQuantity] = useState(1);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [descOpen, setDescOpen] = useState(false);
  const addItem = useCartStore((s) => s.addItem);
  const { user, openAuthModal } = useAuthStore();
  const router = useRouter();
  const [currentUrl, setCurrentUrl] = useState('');

  useEffect(() => {
    setCurrentUrl(window.location.href);
  }, []);

  useEffect(() => {
    setSelectedImage(0);
    if (isSizeVariantPage && product.sizeName) {
      setSelectedSize(product.sizeName);
    }
  }, [currentSlug, isSizeVariantPage, product.sizeName]);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) setSelectedImage((s) => (s === images.length - 1 ? 0 : s + 1));
    if (distance < -50) setSelectedImage((s) => (s === 0 ? images.length - 1 : s - 1));
    setTouchStart(0);
    setTouchEnd(0);
  };

  const discount = calculateDiscount(price, discountPrice);
  const hasDiscount = discount > 0;
  const isOutOfStock = stock <= 0;
  const colorName = product.colorName || '';

  const handleAddToCart = () => {
    if (sizes.length > 0 && !selectedSize) {
      alert('Please select a size');
      return;
    }
    addItem(
      {
        productId: product.parentProductId || product._id,
        variantId: product.variantId,
        name: productName,
        image: images[0] || '',
        size: selectedSize,
        color: colorName,
        colorHex: product.colorHex,
        price,
        discountPrice,
      },
      quantity
    );
  };

  const handleBuyNow = () => {
    handleAddToCart();
    if (!user) {
      openAuthModal('/checkout');
    } else {
      router.push('/checkout');
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-10 md:gap-16">
      {/* Left: Image Gallery */}
      <div className="w-full md:w-1/2 flex flex-col-reverse md:flex-row gap-4">
        <div className="flex md:flex-col gap-4 overflow-x-auto md:overflow-y-auto no-scrollbar md:w-20 shrink-0">
          {images.length > 0 ? (
            images.map((img: string, i: number) => (
              <button
                key={i}
                onClick={() => setSelectedImage(i)}
                className={`relative w-20 h-24 bg-[var(--surface)] shrink-0 border-2 transition-all ${
                  selectedImage === i ? 'border-[var(--gold)] opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                }`}
              >
                <Image src={img} alt={`${productName} ${i + 1}`} fill className="object-cover" />
              </button>
            ))
          ) : (
            <div className="w-20 h-24 bg-gray-100 border-2 border-[var(--gold)]" />
          )}
        </div>

        <div
          className="relative aspect-square md:aspect-[3/4] w-full bg-[var(--surface)] rounded overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Image
            src={images[selectedImage] || '/placeholder.jpg'}
            alt={productName}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 md:hidden">
              {images.map((_: string, i: number) => (
                <div key={i} className={`w-2 h-2 rounded-full ${selectedImage === i ? 'bg-[var(--gold)]' : 'bg-gray-300'}`} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Info & Actions */}
      <div className="w-full md:w-1/2 flex flex-col pt-4 md:py-8">
        <div className="mb-2 uppercase text-xs font-bold tracking-[0.2em] text-[var(--gold)]">
          {product.category}
        </div>
        <h1 className="text-3xl md:text-5xl font-playfair font-bold leading-tight mb-4">
          {productName}
        </h1>

        <div className="flex items-center gap-4 mb-8">
          {hasDiscount ? (
            <>
              <span className="text-3xl font-bold">{formatPrice(discountPrice)}</span>
              <span className="text-xl text-[var(--text-secondary)] line-through">{formatPrice(price)}</span>
              <span className="bg-[#FFE5E5] text-[var(--sale-red)] px-2 py-1 rounded text-sm font-bold">
                {discount}% OFF
              </span>
            </>
          ) : (
            <span className="text-3xl font-bold">{formatPrice(price)}</span>
          )}
        </div>

        <div className="mb-8 border-b border-[var(--border)] pb-4 md:border-0 md:pb-0">
          <button
            className="w-full flex justify-between items-center md:hidden font-bold py-2"
            onClick={() => setDescOpen(!descOpen)}
          >
            Product Description
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transform transition-transform ${descOpen ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          <p className={`text-[var(--text-secondary)] leading-relaxed mt-2 md:block ${descOpen ? 'block' : 'hidden'}`}>
            {description}
          </p>
        </div>

        {isOutOfStock ? (
          <div className="bg-gray-100 text-gray-500 font-bold p-4 text-center rounded mb-8">
            OUT OF STOCK
          </div>
        ) : (
          <>
            {variants.length > 0 && (
              <VariantThumbnailGrid
                variants={variants}
                currentSlug={currentSlug}
              />
            )}

            {hasSizeVariants && (
              <SizeVariantLinks
                sizeVariants={sizeVariants}
                currentSlug={currentSlug}
                activeSizeName={product.sizeName}
              />
            )}

            {sizes.length > 0 && !isSizeVariantPage && !hasSizeVariants && (
              <div className="mb-8 border-t border-[var(--border)] pt-8">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-semibold uppercase tracking-wider text-sm">Select Size</span>
                  <button className="text-[var(--text-secondary)] text-sm underline hover:text-[var(--gold)]">Size Guide</button>
                </div>
                <div className="flex flex-wrap gap-3">
                  {sizes.map((size: string) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`nav-link w-12 h-12 flex items-center justify-center border transition-all rounded font-medium ${
                        selectedSize === size
                          ? 'border-[var(--gold)] bg-[var(--gold-light)] text-black'
                          : 'border-[var(--border)] hover:border-black text-[var(--text-secondary)]'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-8">
              <span className="font-semibold uppercase tracking-wider text-sm block mb-4">Quantity</span>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-[var(--border)] rounded">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-4 py-3 hover:bg-gray-50 text-[var(--text-secondary)] transition-colors">-</button>
                  <span className="px-4 font-semibold w-12 text-center">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="px-4 py-3 hover:bg-gray-50 text-[var(--text-secondary)] transition-colors">+</button>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">Only {stock} left in stock</p>
              </div>
            </div>

            <div className="hidden md:flex flex-col gap-4">
              <button onClick={handleAddToCart} className="btn-gold w-full text-base py-4 rounded shadow-sm hover:shadow-md h-[48px]">
                ADD TO CART
              </button>
              <button onClick={handleBuyNow} className="btn-gold-outline w-full text-base py-4 rounded border-2 bg-transparent text-black border-black hover:bg-black hover:text-white h-[48px]">
                BUY IT NOW
              </button>
            </div>

            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white p-4 border-t border-[var(--border)] z-50 flex gap-4 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
              <button onClick={handleAddToCart} className="flex-1 btn-gold py-3 text-xs rounded min-h-[44px]">ADD TO CART</button>
              <button onClick={handleBuyNow} className="flex-1 btn-gold-outline py-3 text-[10px] font-bold tracking-widest text-[#1a1a1a] rounded min-h-[44px]">BUY NOW →</button>
            </div>
          </>
        )}

        {/* Show variant grid even when out of stock so users can pick another color */}
        {isOutOfStock && variants.length > 0 && (
          <VariantThumbnailGrid variants={variants} currentSlug={currentSlug} />
        )}

        {isOutOfStock && hasSizeVariants && (
          <SizeVariantLinks
            sizeVariants={sizeVariants}
            currentSlug={currentSlug}
            activeSizeName={product.sizeName}
          />
        )}

        <div className="mt-8 flex flex-col md:flex-row gap-4">
          <a
            href={`${WHATSAPP_LINK}?text=${encodeURIComponent(`Check out this product: ${currentUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#25D366]/10 text-[#25D366] py-3 px-4 rounded font-medium border border-[#25D366]/20 transition-colors hover:bg-[#25D366]/20 w-full md:w-auto h-[48px]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.573c-.199 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            <span className="text-sm">Share on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}
