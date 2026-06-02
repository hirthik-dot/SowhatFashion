export type StockImage = {
  id: string;
  url: string;
  alt: string;
  tags: string[];
};

export const STOCK_IMAGE_LIBRARY: StockImage[] = [
  { id: '1', url: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf47?w=800&q=80', alt: 'Menswear lifestyle', tags: ['mens-fashion', 'lifestyle', 'minimal'] },
  { id: '2', url: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80', alt: 'Man in blazer', tags: ['mens-fashion', 'clothing', 'dark'] },
  { id: '3', url: 'https://images.unsplash.com/photo-1507003211169-e69fe9c31a88?w=800&q=80', alt: 'Portrait minimal', tags: ['lifestyle', 'minimal'] },
  { id: '4', url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80', alt: 'Shirt detail', tags: ['clothing', 'mens-fashion'] },
  { id: '5', url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800&q=80', alt: 'Trousers', tags: ['clothing', 'mens-fashion'] },
  { id: '6', url: 'https://images.unsplash.com/photo-1551028711-22b038b0420f?w=800&q=80', alt: 'Jacket', tags: ['clothing', 'dark'] },
  { id: '7', url: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800&q=80', alt: 'Accessories', tags: ['lifestyle', 'minimal'] },
  { id: '8', url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80', alt: 'Fashion editorial', tags: ['mens-fashion', 'dark'] },
  { id: '9', url: 'https://images.unsplash.com/photo-1617127365659-22b7a1f99693?w=800&q=80', alt: 'Street style', tags: ['lifestyle', 'mens-fashion'] },
  { id: '10', url: 'https://images.unsplash.com/photo-1624378515194-6db612adff4d?w=800&q=80', alt: 'Minimal outfit', tags: ['minimal', 'clothing'] },
  { id: '11', url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80', alt: 'White tee', tags: ['clothing', 'minimal'] },
  { id: '12', url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&q=80', alt: 'Business casual', tags: ['mens-fashion', 'formal'] },
];

export const STOCK_FILTER_TABS = ['All', "Men's Fashion", 'Clothing', 'Lifestyle', 'Minimal', 'Dark & Moody'] as const;

export function filterStockImages(query: string, tab: string): StockImage[] {
  let list = STOCK_IMAGE_LIBRARY;
  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (img) =>
        img.alt.toLowerCase().includes(q) ||
        img.tags.some((t) => t.includes(q))
    );
  }
  if (tab && tab !== 'All') {
    const key = tab.toLowerCase().replace(/'/g, '').replace(/\s+/g, '-');
    if (key.includes('men')) list = list.filter((i) => i.tags.includes('mens-fashion'));
    else if (key === 'clothing') list = list.filter((i) => i.tags.includes('clothing'));
    else if (key === 'lifestyle') list = list.filter((i) => i.tags.includes('lifestyle'));
    else if (key === 'minimal') list = list.filter((i) => i.tags.includes('minimal'));
    else if (key.includes('dark')) list = list.filter((i) => i.tags.includes('dark'));
  }
  return list;
}
