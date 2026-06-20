export interface ProductVariantSummary {
  _id: string;
  slug: string;
  colorName: string;
  colorHex: string;
  images: string[];
  price?: number;
  discountPrice?: number;
  stock?: number;
  isActive?: boolean;
  thumbnail?: string;
}

export interface ProductVariantForm {
  _id?: string;
  slug?: string;
  colorName: string;
  colorHex: string;
  images: string[];
  price?: number | null;
  discountPrice?: number | null;
  stock?: number | null;
  sku?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export function emptyVariantForm(): ProductVariantForm {
  return {
    colorName: '',
    colorHex: '#000000',
    images: [],
    isActive: true,
  };
}

export function variantThumbnail(variant: ProductVariantSummary): string {
  return variant.thumbnail || variant.images?.[0] || '/placeholder.jpg';
}

export function isVariantOutOfStock(variant: ProductVariantSummary): boolean {
  return (variant.stock ?? 1) <= 0;
}
