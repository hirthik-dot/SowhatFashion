/** Canonical top-level store categories — shared with homepage tiles and admin categories. */
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

/** Map legacy tile keys / collection slugs to canonical category slugs. */
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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** All category strings that should match a storefront category filter. */
export function categoryMatchValues(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const canonical = normalizeCategorySlug(trimmed);
  if (!canonical) return [trimmed];

  const aliases = Object.entries(CATEGORY_SLUG_ALIASES)
    .filter(([, slug]) => slug === canonical)
    .map(([alias]) => alias);

  return [...new Set([canonical, ...aliases])];
}

/** MongoDB condition for filtering products by category slug (handles aliases). */
export function buildCategoryFilterCondition(raw: string): Record<string, unknown> {
  const values = categoryMatchValues(raw);
  return {
    category: {
      $regex: new RegExp(`^(${values.map(escapeRegex).join('|')})$`, 'i'),
    },
  };
}
