import { STORE_CATEGORIES, categoryProductLink } from './store-categories';

export type FilterOption = { label: string; value: string; count?: number };

export type FilterGroup = {
  id: string;
  label: string;
  type: 'checkbox' | 'radio' | 'size-buttons' | 'color-swatches' | 'price-range' | 'toggle';
  options?: FilterOption[];
  paramKey?: string;
  rangeMin?: number;
  rangeMax?: number;
  rangeStep?: number;
};

export const COLLECTION_FILTER_GROUPS: FilterGroup[] = [
  {
    id: 'fit',
    label: 'FIT',
    type: 'checkbox',
    paramKey: 'fit',
    options: [
      { label: 'Bootcut', value: 'bootcut', count: 1 },
      { label: 'Cropped', value: 'cropped', count: 1 },
      { label: 'Loose', value: 'loose', count: 1 },
      { label: 'Oversized', value: 'oversized', count: 4 },
      { label: 'Regular', value: 'regular', count: 119 },
      { label: 'Relaxed', value: 'relaxed', count: 7 },
      { label: 'Slim', value: 'slim', count: 186 },
      { label: 'Straight', value: 'straight', count: 18 },
    ],
  },
  {
    id: 'collar',
    label: 'COLLAR',
    type: 'checkbox',
    paramKey: 'collar',
    options: [
      { label: 'Button-Down', value: 'button-down' },
      { label: 'Cuban', value: 'cuban' },
      { label: 'High Neck', value: 'high-neck' },
      { label: 'Mandarin', value: 'mandarin' },
      { label: 'Notched Lapel', value: 'notched-lapel' },
      { label: 'Polo', value: 'polo' },
      { label: 'Regular', value: 'regular-collar' },
      { label: 'Spread', value: 'spread' },
      { label: 'Stand', value: 'stand' },
    ],
  },
  {
    id: 'sleeves',
    label: 'SLEEVES',
    type: 'checkbox',
    paramKey: 'sleeves',
    options: [
      { label: 'Long Sleeves', value: 'long' },
      { label: 'Short Sleeves', value: 'short' },
      { label: 'Sleeveless', value: 'sleeveless' },
    ],
  },
  {
    id: 'size',
    label: 'SIZE',
    type: 'size-buttons',
    paramKey: 'size',
    options: [
      { label: 'XS', value: 'XS' },
      { label: 'S', value: 'S' },
      { label: 'M', value: 'M' },
      { label: 'L', value: 'L' },
      { label: 'XL', value: 'XL' },
      { label: 'XXL', value: 'XXL' },
      { label: '28/30', value: '28/30' },
      { label: '29/30', value: '29/30' },
      { label: '30/30', value: '30/30' },
      { label: '32/30', value: '32/30' },
      { label: '32/32', value: '32/32' },
      { label: '34/32', value: '34/32' },
    ],
  },
  {
    id: 'neck',
    label: 'NECK TYPE',
    type: 'checkbox',
    paramKey: 'neck',
    options: [
      { label: 'Hooded', value: 'hooded' },
      { label: 'Polo', value: 'polo-neck' },
      { label: 'Round', value: 'round' },
      { label: 'Turtle', value: 'turtle' },
      { label: 'V-Neck', value: 'v-neck' },
    ],
  },
  {
    id: 'fabric',
    label: 'FABRIC',
    type: 'checkbox',
    paramKey: 'fabric',
    options: [
      { label: 'Cotton', value: 'cotton' },
      { label: 'Linen', value: 'linen' },
      { label: 'Lyocell', value: 'lyocell' },
      { label: 'Nylon', value: 'nylon' },
      { label: 'Organic Cotton', value: 'organic-cotton' },
      { label: 'Polyester', value: 'polyester' },
      { label: 'Tencel', value: 'tencel' },
      { label: 'Viscose', value: 'viscose' },
      { label: 'Wool', value: 'wool' },
    ],
  },
  {
    id: 'pattern',
    label: 'PATTERN',
    type: 'checkbox',
    paramKey: 'pattern',
    options: [
      { label: 'Checked', value: 'checked' },
      { label: 'Colourblocked', value: 'colourblocked' },
      { label: 'Plain Coloured', value: 'plain' },
      { label: 'Printed', value: 'printed' },
      { label: 'Self-Design', value: 'self-design' },
      { label: 'Solid', value: 'solid' },
      { label: 'Striped', value: 'striped' },
      { label: 'Structure', value: 'structure' },
      { label: 'Washed', value: 'washed' },
    ],
  },
  {
    id: 'color',
    label: 'COLOR',
    type: 'color-swatches',
    paramKey: 'color',
    options: [
      { label: 'Blue', value: '#2563EB' },
      { label: 'Navy', value: '#1E3A5F' },
      { label: 'Black', value: '#111111' },
      { label: 'White', value: '#FFFFFF' },
      { label: 'Grey', value: '#9CA3AF' },
      { label: 'Green', value: '#166534' },
      { label: 'Red', value: '#B91C1C' },
      { label: 'Beige', value: '#D4C4A8' },
    ],
  },
  {
    id: 'price',
    label: 'PRICE RANGE',
    type: 'price-range',
    paramKey: 'price',
  },
  {
    id: 'occasion',
    label: 'OCCASION',
    type: 'checkbox',
    paramKey: 'occasion',
    options: [
      { label: 'Casual', value: 'casual', count: 252 },
      { label: 'Formal', value: 'formal', count: 91 },
    ],
  },
  {
    id: 'inStock',
    label: 'IN STOCK ONLY',
    type: 'toggle',
    paramKey: 'inStock',
  },
];

export const SHOP_CATEGORY_TABS = [
  { label: 'All', href: '/products', match: { category: '', newArrival: false, featured: false, collection: '' } },
  ...STORE_CATEGORIES.map((cat) => ({
    label: cat.name,
    href: categoryProductLink(cat.slug),
    match: { category: cat.slug },
  })),
  { label: 'New In', href: '/products?newArrival=true', match: { newArrival: true } },
] as const;

export const SORT_OPTIONS = [
  { label: 'Featured', value: 'featured' },
  { label: 'Most Relevant', value: '' },
  { label: 'Best Selling', value: 'best_selling' },
  { label: 'Price Low–High', value: 'price_asc' },
  { label: 'Price High–Low', value: 'price_desc' },
  { label: 'New Arrival', value: 'newest' },
] as const;

export const SEO_SHOP_LINKS = [
  {
    title: 'Topwear',
    links: [
      { label: 'Shirts', href: '/collections/shirts' },
      { label: 'Overshirts', href: '/products?category=shirt' },
      { label: 'T-Shirts', href: '/collections/tshirts' },
      { label: 'Polos', href: '/products?category=shirt' },
    ],
  },
  {
    title: 'Bottomwear',
    links: [
      { label: 'Jeans', href: '/products?category=pant' },
      { label: 'Trousers', href: '/collections/trousers' },
      { label: 'Chinos', href: '/products?category=pant' },
      { label: 'Pants', href: '/products?category=pant' },
    ],
  },
  {
    title: 'Winterwear',
    links: [
      { label: 'Jackets', href: '/products' },
      { label: 'Coats', href: '/products' },
      { label: 'Cardigans', href: '/products' },
      { label: 'Blazers', href: '/products?category=shirt' },
    ],
  },
];
