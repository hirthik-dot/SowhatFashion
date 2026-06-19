'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import CollectionFilterSidebar from './CollectionFilterSidebar';
import CollectionProductCard from './CollectionProductCard';
import { SORT_OPTIONS, SEO_SHOP_LINKS, SHOP_CATEGORY_TABS } from '@/lib/collection-filters';
import { getCategoryDisplayName } from '@/lib/store-categories';
import {
  sidebarConfigToFilterGroups,
  getFacetParamKeys,
  type SidebarFilterConfig,
  type ProductCountsResponse,
} from '@/lib/sidebar-filters';
import { DEFAULT_FILTER_GROUPS } from '@/lib/sidebar-filters-default';
import { productListKey } from '@/lib/utils';
import { cn } from '@/lib/utils';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const PAGE_SIZE = 24;

function parseDraftFromParams(
  params: URLSearchParams,
  facetKeys: string[]
): Record<string, string | string[] | boolean> {
  const draft: Record<string, string | string[] | boolean> = {};
  if (params.get('minPrice')) draft.minPrice = params.get('minPrice')!;
  if (params.get('maxPrice')) draft.maxPrice = params.get('maxPrice')!;
  if (params.get('inStock') === 'true') draft.inStock = true;
  facetKeys.forEach((k) => {
    const v = params.get(k);
    if (v) draft[k] = v.split(',').filter(Boolean);
  });
  return draft;
}

function draftToQuery(
  draft: Record<string, string | string[] | boolean>,
  base: URLSearchParams,
  facetKeys: string[],
  priceMax = 15000
) {
  const p = new URLSearchParams(base.toString());
  facetKeys.forEach((k) => p.delete(k));
  p.delete('inStock');
  if (draft.minPrice) p.set('minPrice', String(draft.minPrice));
  else p.delete('minPrice');
  if (draft.maxPrice && Number(draft.maxPrice) < priceMax) p.set('maxPrice', String(draft.maxPrice));
  else p.delete('maxPrice');
  if (draft.inStock) p.set('inStock', 'true');
  else p.delete('inStock');
  facetKeys.forEach((k) => {
    const val = draft[k];
    if (Array.isArray(val) && val.length) p.set(k, val.join(','));
    else p.delete(k);
  });
  return p;
}

function CollectionLayoutInner({
  collectionTitle,
  breadcrumbMiddle = 'Shop',
  initialParams,
}: {
  collectionTitle?: string;
  breadcrumbMiddle?: string;
  initialParams?: Record<string, string>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [seoOpen, setSeoOpen] = useState(false);
  const [filterGroups, setFilterGroups] = useState(DEFAULT_FILTER_GROUPS);
  const [facetKeys, setFacetKeys] = useState<string[]>(() => getFacetParamKeys(DEFAULT_FILTER_GROUPS));
  const [priceMax, setPriceMax] = useState(15000);

  const [draft, setDraft] = useState<Record<string, string | string[] | boolean>>(() =>
    parseDraftFromParams(searchParams, getFacetParamKeys(DEFAULT_FILTER_GROUPS))
  );

  const page = parseInt(searchParams.get('page') || '1', 10);
  const sort = searchParams.get('sort') || '';
  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || searchParams.get('q') || '';
  const newArrival = searchParams.get('newArrival') === 'true';
  const featured = searchParams.get('featured') === 'true';
  const collectionSlug = pathname.startsWith('/collections/')
    ? pathname.replace('/collections/', '').split('/')[0]
    : '';

  const title = useMemo(() => {
    if (collectionTitle) return collectionTitle.toUpperCase();
    if (search) return `SEARCH: ${search.toUpperCase()}`;
    if (newArrival) return 'NEW ARRIVALS';
    if (featured) return 'FEATURED';
    if (category) {
      return getCategoryDisplayName(category).toUpperCase();
    }
    return 'ALL PRODUCTS';
  }, [collectionTitle, search, newArrival, featured, category]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams(searchParams.toString());
      p.set('limit', String(PAGE_SIZE));
      p.set('page', String(page));
      if (sort === 'featured') {
        p.set('featured', 'true');
        p.delete('sort');
      } else if (sort === 'newest') {
        p.set('newArrival', 'true');
        p.delete('sort');
      } else if (sort === 'best_selling') {
        p.set('featured', 'true');
        p.delete('sort');
      } else if (sort) {
        p.set('sort', sort);
      }
      const res = await fetch(`${API}/api/products?${p.toString()}`);
      const data = await res.json();
      let list = data.products || [];
      if (searchParams.get('inStock') === 'true') {
        list = list.filter((pr: any) => (pr.stock ?? 0) > 0 || (pr.totalStock ?? 0) > 0);
      }
      setProducts(list);
      setTotal(data.total ?? list.length);
    } catch {
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [searchParams, page, sort]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const cat = searchParams.get('category') || '';
    Promise.all([
      fetch(`${API_BASE}/api/catalogue/sidebar-config`).then((r) => r.json()),
      fetch(`${API_BASE}/api/catalogue/product-counts${cat ? `?category=${cat}` : ''}`).then((r) => r.json()),
    ])
      .then(([config, counts]: [{ filters?: SidebarFilterConfig[] }, ProductCountsResponse]) => {
        const filters = config?.filters?.length ? config.filters : [];
        const groups = filters.length
          ? sidebarConfigToFilterGroups(filters, counts)
          : DEFAULT_FILTER_GROUPS;
        setFilterGroups(groups);
        const keys = getFacetParamKeys(groups);
        setFacetKeys(keys);
        const priceGroup = groups.find((g) => g.type === 'price-range');
        if (priceGroup?.rangeMax) setPriceMax(priceGroup.rangeMax);
      })
      .catch(() => {});
  }, [searchParams]);

  useEffect(() => {
    if (!initialParams || Object.keys(initialParams).length === 0) return;
    const p = new URLSearchParams(searchParams.toString());
    let changed = false;
    Object.entries(initialParams).forEach(([k, v]) => {
      if (!p.get(k)) {
        p.set(k, v);
        changed = true;
      }
    });
    if (changed) router.replace(`${pathname}?${p.toString()}`);
  }, [initialParams, pathname, router, searchParams]);

  useEffect(() => {
    setDraft(parseDraftFromParams(searchParams, facetKeys));
  }, [searchParams, facetKeys]);

  const applyDraft = () => {
    const p = draftToQuery(draft, searchParams, facetKeys, priceMax);
    p.delete('page');
    router.push(`${pathname}?${p.toString()}`);
    setMobileFiltersOpen(false);
  };

  const clearFilters = () => {
    const p = new URLSearchParams();
    if (category) p.set('category', category);
    if (search) p.set('search', search);
    if (newArrival) p.set('newArrival', 'true');
    if (featured) p.set('featured', 'true');
    ['minPrice', 'maxPrice', 'inStock', 'size', 'promotions', 'discount', ...facetKeys].forEach((k) =>
      p.delete(k)
    );
    setDraft({});
    router.push(`${pathname}?${p.toString()}`);
    setMobileFiltersOpen(false);
  };

  const setSort = (value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set('sort', value);
    else p.delete('sort');
    p.delete('page');
    router.push(`${pathname}?${p.toString()}`);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const isTabActive = (tab: (typeof SHOP_CATEGORY_TABS)[number]) => {
    if ('collection' in tab.match && tab.match.collection) {
      return collectionSlug === tab.match.collection;
    }
    if ('newArrival' in tab.match && tab.match.newArrival) {
      return newArrival && !category && !collectionSlug;
    }
    if ('featured' in tab.match && tab.match.featured === false && tab.label === 'All') {
      return !category && !newArrival && !featured && !collectionSlug && !search;
    }
    if ('category' in tab.match && tab.match.category) {
      return category.toLowerCase() === tab.match.category && !collectionSlug;
    }
    return false;
  };

  const loadMore = () => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('page', String(page + 1));
    router.push(`${pathname}?${p.toString()}`);
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-8 md:py-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8 pb-6 border-b border-[#E8E4DF]">
        <div>
          <nav className="text-[11px] uppercase tracking-[0.15em] text-[#999] mb-3">
            <Link href="/" className="hover:text-[#111] premium-link">Home</Link>
            <span className="mx-2">›</span>
            <Link href="/products" className="hover:text-[#111] premium-link">{breadcrumbMiddle}</Link>
            <span className="mx-2">›</span>
            <span className="text-[#666]">{title}</span>
          </nav>
          <h1 className="font-cormorant font-light text-[28px] md:text-[32px] text-[#111]">{title}</h1>
          <p className="text-sm text-[#999] mt-1">({total} products)</p>
          <nav className="flex flex-wrap gap-1 mt-6 -mb-2 overflow-x-auto no-scrollbar">
            {SHOP_CATEGORY_TABS.map((tab) => (
              <Link
                key={tab.label}
                href={tab.href}
                className={cn('category-tab whitespace-nowrap', isTabActive(tab) && 'active')}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-[11px] uppercase tracking-[0.15em] text-[#666]">
              Sort By
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border border-[#E8E4DF] text-sm px-3 py-2 bg-white focus:outline-none focus:border-[#111]"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value || 'rel'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex border border-[#E8E4DF]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn('p-2', viewMode === 'grid' ? 'bg-[#111] text-white' : 'text-[#666]')}
              aria-label="Grid view"
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn('p-2', viewMode === 'list' ? 'bg-[#111] text-white' : 'text-[#666]')}
              aria-label="List view"
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-8 lg:gap-12">
        {/* Desktop sidebar — viewport-height panel with internal scroll */}
        <div className="hidden lg:block w-[280px] shrink-0 self-start">
          <div className="sticky top-[104px] z-30 h-[calc(100vh-104px)] min-h-[320px]">
            <CollectionFilterSidebar
              draft={draft}
              onChange={setDraft}
              onClear={clearFilters}
              onApply={applyDraft}
              resultCount={total}
              filterGroups={filterGroups}
            />
          </div>
        </div>

        {/* Products */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="py-24 text-center text-[#999] text-sm uppercase tracking-widest">Loading…</div>
          ) : products.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-[#666] mb-4">No products match your filters.</p>
              <button type="button" onClick={clearFilters} className="text-[11px] uppercase tracking-widest underline">
                Clear all filters
              </button>
            </div>
          ) : (
            <div
              className={cn(
                viewMode === 'grid'
                  ? 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7'
                  : 'flex flex-col gap-4'
              )}
            >
              {products.map((product) => (
                <CollectionProductCard key={productListKey(product)} product={product} listView={viewMode === 'list'} />
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="mt-12 flex flex-col items-center gap-6">
            <div className="flex gap-4 text-sm">
              {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => i + 1).map((n) => (
                <Link
                  key={n}
                  href={`${pathname}?${(() => {
                    const p = new URLSearchParams(searchParams.toString());
                    p.set('page', String(n));
                    return p.toString();
                  })()}`}
                  className={cn(
                    'min-w-[28px] text-center',
                    page === n ? 'text-[#111] underline underline-offset-4' : 'text-[#999] hover:text-[#111]'
                  )}
                >
                  {n}
                </Link>
              ))}
              {totalPages > 8 && <span className="text-[#999]">…</span>}
            </div>
            {page < totalPages && (
              <button
                type="button"
                onClick={loadMore}
                className="text-[11px] uppercase tracking-[0.2em] border border-[#111] px-10 py-3 hover:bg-[#111] hover:text-white transition-colors"
              >
                Load More
              </button>
            )}
          </div>

          {/* SEO links */}
          <div className="mt-16 border-t border-[#E8E4DF] pt-6">
            <button
              type="button"
              onClick={() => setSeoOpen(!seoOpen)}
              className="flex items-center justify-between w-full text-left text-sm text-[#666] uppercase tracking-wider"
            >
              Shop For
              <ChevronSmall open={seoOpen} />
            </button>
            {seoOpen && (
              <div className="mt-4 space-y-4 text-[12px] text-[#999]">
                {SEO_SHOP_LINKS.map((section) => (
                  <p key={section.title}>
                    <span className="text-[#666] font-medium">{section.title}: </span>
                    {section.links.map((link, i) => (
                      <span key={link.href}>
                        {i > 0 && ' · '}
                        <Link href={link.href} className="hover:text-[#111] premium-link">
                          {link.label}
                        </Link>
                      </span>
                    ))}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E8E4DF] p-3">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="w-full bg-[#111] text-white text-[11px] uppercase tracking-[0.2em] py-3.5 font-semibold"
        >
          Filter
        </button>
      </div>

      {mobileFiltersOpen && (
        <div className="lg:hidden fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white max-h-[90vh] flex flex-col rounded-t-lg">
            <div className="p-4 border-b flex justify-between items-center">
              <span className="text-[11px] uppercase tracking-widest font-semibold">Filters</span>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <CollectionFilterSidebar
                draft={draft}
                onChange={setDraft}
                onClear={clearFilters}
                onApply={applyDraft}
                resultCount={total}
                filterGroups={filterGroups}
              />
            </div>
          </div>
        </div>
      )}

      <div className="h-16 lg:hidden" />
    </div>
  );
}

function ChevronSmall({ open }: { open: boolean }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" className={cn(open && 'rotate-180')}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function CollectionLayout(props: {
  collectionTitle?: string;
  breadcrumbMiddle?: string;
  initialParams?: Record<string, string>;
}) {
  return (
    <Suspense fallback={<div className="py-20 text-center text-[#999]">Loading shop…</div>}>
      <CollectionLayoutInner {...props} />
    </Suspense>
  );
}
