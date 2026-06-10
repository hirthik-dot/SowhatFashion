import slugify from 'slugify';

/** Map billing category display names to ecommerce catalogue slugs. */
export function toEcommerceCategorySlug(name: string): string {
  const normalized = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  if (normalized.includes('tshirt')) return 'tshirt';
  if (normalized === 'shirts' || normalized === 'shirt') return 'shirt';
  if (normalized.includes('pant') || normalized.includes('trouser')) return 'pant';

  const slug = slugify(String(name || '').trim(), { lower: true, strict: true });
  return slug.replace(/s$/i, '') || 'other';
}

export function toEcommerceSubCategorySlug(name: string): string {
  return slugify(String(name || '').trim(), { lower: true, strict: true }) || '';
}

export function applyBillingCategoriesToProduct(
  product: { category?: string; subCategory?: string },
  categoryName: string,
  subCategoryName: string
) {
  product.category = toEcommerceCategorySlug(categoryName);
  product.subCategory = toEcommerceSubCategorySlug(subCategoryName);
}
