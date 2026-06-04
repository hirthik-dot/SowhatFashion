export type HeroMediaType = 'video' | 'image';

export function isInstagramReelUrl(url: string): boolean {
  return /instagram\.com\/(reel|p|tv)\//i.test(url.trim());
}

/** Instagram blocks autoplay in embeds — only direct/hosted video URLs work for the hero. */
export function isAutoplayVideoUrl(url: string): boolean {
  const u = url.trim();
  if (!u || isInstagramReelUrl(u)) return false;
  return true;
}

export function resolveShopNowHref(
  linkedProductId: string | undefined | null,
  linkedProductSlug: string | undefined | null,
  products: { _id?: string; slug?: string }[]
): string {
  if (!linkedProductId) return '/products';
  if (linkedProductSlug?.trim()) return `/products/${linkedProductSlug.trim()}`;
  const product = products.find((p) => String(p._id) === String(linkedProductId));
  if (product?.slug) return `/products/${product.slug}`;
  return '/products';
}
