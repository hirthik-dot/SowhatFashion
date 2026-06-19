/** Canonical top-level store categories — must match backend storeCategories.ts */
export const STORE_CATEGORIES = [
  { slug: 'shirt', name: 'Shirts', order: 1 },
  { slug: 'pant', name: 'Pants', order: 2 },
  { slug: 'tshirt', name: 'T-Shirts', order: 3 },
  { slug: 'track', name: 'Track', order: 4 },
  { slug: 'shorts', name: 'Shorts', order: 5 },
  { slug: 'innerwears', name: 'Innerwears', order: 6 },
  { slug: 'footwears', name: 'Footwears', order: 7 },
] as const;

export type StoreCategorySlug = (typeof STORE_CATEGORIES)[number]['slug'];

export const CATEGORY_SLUG_ALIASES: Record<string, StoreCategorySlug> = {
  shirts: 'shirt',
  shirt: 'shirt',
  pants: 'pant',
  pant: 'pant',
  trousers: 'pant',
  tshirts: 'tshirt',
  tshirt: 'tshirt',
  't-shirts': 'tshirt',
  track: 'track',
  tracks: 'track',
  shorts: 'shorts',
  short: 'shorts',
  innerwears: 'innerwears',
  innerwear: 'innerwears',
  footwears: 'footwears',
  footwear: 'footwears',
};

export function normalizeCategorySlug(raw: string): StoreCategorySlug | null {
  const key = raw.trim().toLowerCase();
  return CATEGORY_SLUG_ALIASES[key] ?? null;
}

export function categoryProductLink(slug: StoreCategorySlug): string {
  return `/products?category=${slug}`;
}

export function getCategoryDisplayName(slug: string): string {
  const normalized = normalizeCategorySlug(slug);
  if (normalized) {
    const cat = STORE_CATEGORIES.find((c) => c.slug === normalized);
    if (cat) return cat.name;
  }
  return slug;
}

export const STORE_CATEGORY_FILTER_OPTIONS = STORE_CATEGORIES.map((cat) => ({
  label: cat.name,
  value: cat.slug,
}));
