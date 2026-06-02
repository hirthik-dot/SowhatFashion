/** Default Homepage 3 (catalogue / premium) image slots */
export type CategoryTileSlot = {
  key: string;
  label: string;
  link: string;
  image: string;
  alt: string;
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
  instagramImages?: string[];
  newsletterBg?: string;
};

const UNSPLASH = (id: string, w = 1200) =>
  `https://images.unsplash.com/${id}?w=${w}&q=80`;

export const DEFAULT_CATEGORY_TILES: CategoryTileSlot[] = [
  { key: 'shirts', label: 'Shirts', link: '/collections/shirts', image: UNSPLASH('photo-1596755094514-f87e34085b2c'), alt: 'Shirts collection' },
  { key: 'trousers', label: 'Trousers', link: '/collections/trousers', image: UNSPLASH('photo-1473966968600-fa801b869a1a'), alt: 'Trousers collection' },
  { key: 'outerwear', label: 'Outerwear', link: '/collections/outerwear', image: UNSPLASH('photo-1551028711-22b038b0420f'), alt: 'Outerwear collection' },
  { key: 'accessories', label: 'Accessories', link: '/collections/accessories', image: UNSPLASH('photo-1611652022419-a9419f74343d'), alt: 'Accessories' },
  { key: 'new-arrivals', label: 'New Arrivals', link: '/products?newArrival=true', image: UNSPLASH('photo-1617137968427-85924c800a22'), alt: 'New arrivals' },
];

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
  instagramImages: [
    UNSPLASH('photo-1617137968427-85924c800a22', 600),
    UNSPLASH('photo-1507003211169-e69fe9c31a88', 600),
    UNSPLASH('photo-1611652022419-a9419f74343d', 600),
    UNSPLASH('photo-1594938298603-c8148c4dae35', 600),
    UNSPLASH('photo-1617127365659-22b7a1f99693', 600),
    UNSPLASH('photo-1624378515194-6db612adff4d', 600),
  ],
  newsletterBg: UNSPLASH('photo-1490578474895-699cd4e2cf47', 1920),
};

export function mergeHomepage3Placeholders(stored?: Homepage3Placeholders | null): Homepage3Placeholders {
  if (!stored) return { ...DEFAULT_HOMEPAGE3_PLACEHOLDERS, categoryTiles: [...DEFAULT_CATEGORY_TILES] };
  return {
    ...DEFAULT_HOMEPAGE3_PLACEHOLDERS,
    ...stored,
    categoryTiles: stored.categoryTiles?.length ? stored.categoryTiles : DEFAULT_CATEGORY_TILES,
    carouselImages: stored.carouselImages?.length ? stored.carouselImages : DEFAULT_HOMEPAGE3_PLACEHOLDERS.carouselImages,
    instagramImages: stored.instagramImages?.length ? stored.instagramImages : DEFAULT_HOMEPAGE3_PLACEHOLDERS.instagramImages,
  };
}
