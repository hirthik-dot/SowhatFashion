import { INSTAGRAM_URL } from './contact';
import {
  STORE_CATEGORIES,
  normalizeCategorySlug,
  categoryProductLink,
  type StoreCategorySlug,
} from './store-categories';

/** Default Homepage 3 (catalogue / premium) image slots */
export type CategoryTileSlot = {
  key: string;
  label: string;
  link: string;
  image: string;
  alt: string;
};

export type InstagramPostSlot = {
  image: string;
  link?: string;
};

export type Homepage3Placeholders = {
  heroDesktop?: string;
  heroMobile?: string;
  heroDesktopAlt?: string;
  heroMobileAlt?: string;
  carouselImages?: string[];
  categoryTiles?: CategoryTileSlot[];
  newArrivalsBg?: string;
  newArrivalsBgAlt?: string;
  brandStoryImage?: string;
  brandStoryAlt?: string;
  promoBannerBg?: string;
  promoBannerText?: string;
  /** @deprecated use instagramPosts */
  instagramImages?: string[];
  instagramPosts?: InstagramPostSlot[];
  newsletterBg?: string;
};

const UNSPLASH = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?w=${w}&q=80`;

const TILE_IMAGES: Record<StoreCategorySlug, string> = {
  shirt: UNSPLASH('photo-1596755094514-f87e34085b2c'),
  pant: UNSPLASH('photo-1473966968600-fa801b869a1a'),
  tshirt: UNSPLASH('photo-1521572163474-6864f9cf17ab'),
  track: UNSPLASH('photo-1556821840-3a63f95609a7'),
  shorts: UNSPLASH('photo-1591195853828-11db59a1f06b'),
  innerwears: UNSPLASH('photo-1618354691373-d8519625a276'),
  footwears: UNSPLASH('photo-1549298916-b41d501d3772'),
};

export const DEFAULT_CATEGORY_TILES: CategoryTileSlot[] = STORE_CATEGORIES.map((cat) => ({
  key: cat.slug,
  label: cat.name,
  link: categoryProductLink(cat.slug),
  image: TILE_IMAGES[cat.slug],
  alt: `${cat.name} collection`,
}));

function syncCategoryTiles(stored?: CategoryTileSlot[] | null): CategoryTileSlot[] {
  const bySlug = new Map<StoreCategorySlug, CategoryTileSlot>();

  for (const tile of stored || []) {
    const slug = normalizeCategorySlug(tile.key);
    if (!slug) continue;
    bySlug.set(slug, { ...tile, key: slug });
  }

  return DEFAULT_CATEGORY_TILES.map((def) => {
    const existing = bySlug.get(def.key as StoreCategorySlug);
    if (!existing) return def;
    return {
      ...def,
      label: existing.label || def.label,
      link: existing.link || def.link,
      image: existing.image || def.image,
      alt: existing.alt || def.alt,
    };
  });
}

export const DEFAULT_HOMEPAGE3_PLACEHOLDERS: Homepage3Placeholders = {
  heroDesktop: UNSPLASH('photo-1490578474895-699cd4e2cf47', 1920),
  heroMobile: UNSPLASH('photo-1490578474895-699cd4e2cf47', 800),
  heroDesktopAlt: 'Premium menswear hero',
  heroMobileAlt: 'Premium menswear hero mobile',
  carouselImages: [
    UNSPLASH('photo-1490578474895-699cd4e2cf47', 1920),
    UNSPLASH('photo-1617137968427-85924c800a22', 1920),
    UNSPLASH('photo-1507003211169-e69fe9c31a88', 1920),
  ],
  categoryTiles: DEFAULT_CATEGORY_TILES,
  newArrivalsBg: '',
  brandStoryImage: UNSPLASH('photo-1507003211169-e69fe9c31a88'),
  brandStoryAlt: 'Brand editorial',
  promoBannerBg: '',
  promoBannerText: 'UP TO 50% OFF',
  instagramPosts: [
    { image: UNSPLASH('photo-1617137968427-85924c800a22', 600), link: INSTAGRAM_URL },
    { image: UNSPLASH('photo-1507003211169-e69fe9c31a88', 600), link: INSTAGRAM_URL },
    { image: UNSPLASH('photo-1611652022419-a9419f74343d', 600), link: INSTAGRAM_URL },
    { image: UNSPLASH('photo-1594938298603-c8148c4dae35', 600), link: INSTAGRAM_URL },
    { image: UNSPLASH('photo-1617127365659-22b7a1f99693', 600), link: INSTAGRAM_URL },
    { image: UNSPLASH('photo-1624378515194-6db612adff4d', 600), link: INSTAGRAM_URL },
  ],
  newsletterBg: UNSPLASH('photo-1490578474895-699cd4e2cf47', 1920),
};

function normalizeInstagramPosts(stored?: Homepage3Placeholders | null): InstagramPostSlot[] {
  if (stored?.instagramPosts?.length) {
    return stored.instagramPosts
      .filter((post) => post?.image)
      .slice(0, 6)
      .map((post) => ({
        image: post.image,
        link: post.link?.trim() || INSTAGRAM_URL,
      }));
  }
  if (stored?.instagramImages?.length) {
    return stored.instagramImages
      .filter(Boolean)
      .slice(0, 6)
      .map((image) => ({ image, link: INSTAGRAM_URL }));
  }
  return DEFAULT_HOMEPAGE3_PLACEHOLDERS.instagramPosts!;
}

export function mergeHomepage3Placeholders(stored?: Homepage3Placeholders | null): Homepage3Placeholders {
  if (!stored) return { ...DEFAULT_HOMEPAGE3_PLACEHOLDERS, categoryTiles: syncCategoryTiles() };
  return {
    ...DEFAULT_HOMEPAGE3_PLACEHOLDERS,
    ...stored,
    categoryTiles: syncCategoryTiles(stored.categoryTiles),
    carouselImages: stored.carouselImages?.length
      ? stored.carouselImages
      : stored.heroDesktop
        ? [stored.heroDesktop]
        : DEFAULT_HOMEPAGE3_PLACEHOLDERS.carouselImages,
    instagramPosts: normalizeInstagramPosts(stored),
  };
}
