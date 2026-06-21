import type { ProductVariantForm } from '@/lib/product-variants';

export interface ProductSizeVariantSummary {
  _id: string;
  slug: string;
  sizeName: string;
  images: string[];
  price?: number;
  billingPrice?: number;
  discountPrice?: number;
  stock?: number;
  isActive?: boolean;
  thumbnail?: string;
}

export interface ProductSizeVariantForm {
  _id?: string;
  slug?: string;
  sizeName: string;
  ecommercePrice?: number | null;
  ecommerceDiscountPrice?: number | null;
  billingPrice?: number | null;
  stock?: number | null;
  effectivePrice?: number | null;
  images: string[];
  sortOrder?: number;
  isActive?: boolean;
  colorVariants?: ProductVariantForm[];
}

export function emptySizeVariantForm(sizeName = ''): ProductSizeVariantForm {
  return {
    sizeName,
    images: [],
    isActive: true,
  };
}

export function isSizeVariantOutOfStock(variant: ProductSizeVariantSummary): boolean {
  return (variant.stock ?? 1) <= 0;
}
