'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCartStore } from '@/lib/cart-store';
import { useAuthStore } from '@/lib/auth-store';
import { getProducts, getMegaDropdown, getSidebarConfig, getProductCounts, getCategories } from '@/lib/api';
import { cn } from '@/lib/utils';
import { userInitials, userFirstName } from '@/lib/auth-user';
import OfferCarousel from '@/components/catalogue/OfferCarousel';
import NewArrivalsSection from '@/components/catalogue/NewArrivalsSection';
import CatalogueComboOffersSection from '@/components/catalogue/CatalogueComboOffersSection';
import CatalogueProductCard from '@/components/catalogue/CatalogueProductCard';
import { mergeCatalogueHomeSections, type CatalogueHomeSection } from '@/lib/catalogue-sections';

// --- SVGs ---
const Truck = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11"/><path d="M14 9h4l4 4v5c0 .6-.4 1-1 1h-2"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>;
const Store = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const Phone = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const SearchIcon = ({ size = 20, className = '' }) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const HeartIcon = ({ size = 20, className = '' }) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const BagIcon = ({ size = 20, className = '' }) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>;
const MoreIcon = ({ size = 20, className = '' }) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>;
const CloseIcon = ({ size = 16, className = '' }) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

// --- Filters Components ---
const RangeSliderFilter = ({ filter, minPrice, maxPrice, onChange }: any) => {
   const config = filter.rangeConfig || { min: 199, max: 2999, step: 100, prefix: '₹' };
   const [val, setVal] = useState({ 
      min: minPrice ? parseInt(minPrice) : config.min, 
      max: maxPrice ? parseInt(maxPrice) : config.max 
   });

   useEffect(() => {
      setVal({ 
         min: minPrice ? parseInt(minPrice) : config.min, 
         max: maxPrice ? parseInt(maxPrice) : config.max 
      });
   }, [minPrice, maxPrice, config]);

   const handleApply = () => {
      onChange(val.min.toString(), val.max.toString());
   };

   const minPos = ((val.min - config.min) / (config.max - config.min)) * 100;
   const maxPos = ((val.max - config.min) / (config.max - config.min)) * 100;

   return (
      <div className="py-4 border-b border-[var(--border)]">
         <h4 className="text-sm font-medium mb-5">{filter.label}</h4>
         <div className="px-2 mb-4">
            <div className="relative h-2 rounded-full bg-[#E8E4DF] flex items-center">
               <div className="absolute h-full bg-[#C9A84C] rounded-full" style={{ left: `${minPos}%`, right: `${100 - maxPos}%` }} />
               <input type="range" min={config.min} max={config.max} step={config.step} value={val.min} 
                      onChange={(e) => setVal({...val, min: Math.min(Number(e.target.value), val.max - config.step)})}
                      className="absolute w-full top-1/2 -translate-y-1/2 appearance-none bg-transparent pointer-events-none touch-manipulation [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] max-md:[&::-webkit-slider-thumb]:w-[24px] max-md:[&::-webkit-slider-thumb]:h-[24px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#C9A84C] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] max-md:[&::-moz-range-thumb]:w-[24px] max-md:[&::-moz-range-thumb]:h-[24px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#C9A84C] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-pointer z-10" />
               <input type="range" min={config.min} max={config.max} step={config.step} value={val.max} 
                      onChange={(e) => setVal({...val, max: Math.max(Number(e.target.value), val.min + config.step)})}
                      className="absolute w-full top-1/2 -translate-y-1/2 appearance-none bg-transparent pointer-events-none touch-manipulation [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:h-[18px] max-md:[&::-webkit-slider-thumb]:w-[24px] max-md:[&::-webkit-slider-thumb]:h-[24px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#C9A84C] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:h-[18px] max-md:[&::-moz-range-thumb]:w-[24px] max-md:[&::-moz-range-thumb]:h-[24px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#C9A84C] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-pointer z-20" />
            </div>
         </div>
         <div className="flex justify-between items-center mb-3 px-1 text-xs text-[var(--text-secondary)] font-medium">
            <span>Min {config.prefix}{config.min}</span>
            <span>Max {config.prefix}{config.max}</span>
         </div>
         <div className="flex items-center gap-2">
            <input type="number" value={val.min} readOnly className="w-[60px] h-8 max-md:h-10 border border-[var(--border)] text-xs text-center rounded-sm bg-gray-50 focus:outline-none" />
            <span className="text-[var(--border)]">-</span>
            <input type="number" value={val.max} readOnly className="w-[60px] h-8 max-md:h-10 border border-[var(--border)] text-xs text-center rounded-sm bg-gray-50 focus:outline-none" />
            <button type="button" onClick={handleApply} className="w-8 h-8 max-md:w-10 max-md:h-10 flex items-center justify-center bg-gray-50 hover:bg-[var(--gold)] hover:text-white hover:border-[var(--gold)] transition-colors border border-[var(--border)] rounded-sm ml-auto text-black cursor-pointer touch-manipulation shrink-0">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
         </div>
      </div>
   );
};

const CheckboxListFilter = ({ filter, activeValues, productCounts, onChange }: any) => {
   const [expanded, setExpanded] = useState(false);
   const options = filter.options || [];
   const visibleOptions = expanded ? options : options.slice(0, 4);

   const toggle = (val: string) => {
      if (activeValues.includes(val)) onChange(activeValues.filter((v: string) => v !== val));
      else onChange([...activeValues, val]);
   }

   return (
      <div className="py-4 border-b border-[var(--border)]">
        <h4 className="text-sm font-medium text-[var(--text-primary)] mb-4">{filter.label}</h4>
        <div className="space-y-3">
           {visibleOptions.map((opt: any) => (
              <button
                 key={opt.value}
                 type="button"
                 aria-pressed={activeValues.includes(opt.value)}
                 className="flex flex-row items-center gap-3 cursor-pointer group min-h-[44px] md:min-h-[24px] w-full text-left p-0 m-0 bg-transparent border-0 font-[inherit] text-[inherit] appearance-none touch-manipulation"
                 onClick={() => toggle(opt.value)}
              >
                 <div className={cn(
                    "w-[22px] h-[22px] md:w-[16px] md:h-[16px] shrink-0 border rounded-[2px] flex items-center justify-center mt-0.5 transition-colors",
                    activeValues.includes(opt.value) ? "bg-[var(--gold)] border-[var(--gold)]" : "bg-white border-gray-300 group-hover:border-[var(--gold)]"
                 )}>
                    {activeValues.includes(opt.value) && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                 </div>
                 <div className="text-sm text-[var(--text-secondary)] leading-tight flex-1 max-md:text-base">
                    {opt.label} <span className="text-xs text-gray-400">({productCounts?.[opt.value] || 0})</span>
                 </div>
              </button>
           ))}
           {options.length > 4 && (
              <button 
                 className="text-[var(--gold)] text-sm font-medium mt-2 hover:underline focus:outline-none py-2"
                 onClick={() => setExpanded(!expanded)}
              >
                 {expanded ? '- Show Less' : `+ ${options.length - 4} More`}
              </button>
           )}
        </div>
      </div>
   );
};

// --- Mobile Dropdown Column ---
const MobileColumn = ({ col, category, onClose }: any) => {
   const [open, setOpen] = useState(true);
   const router = useRouter();
   return (
      <div className="border-b border-[var(--border)] last:border-0">
         <button className="w-full flex items-center justify-between py-4 text-sm font-bold uppercase tracking-wider" onClick={() => setOpen(!open)}>
            {col.header}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cn("transition-transform", open ? "rotate-180" : "")}><polyline points="6 9 12 15 18 9"/></svg>
         </button>
         {open && (
            <div className="pb-4 space-y-3 pl-2">
               {col.items?.map((item: any, i: number) => (
                  <button key={i} className="block text-sm text-[var(--text-secondary)] w-full text-left py-2" onClick={() => {
                     onClose();
                     router.push(`/products?category=${category.toLowerCase()}&${item.filterKey}=${item.filterValue}`);
                  }}>
                     {item.label}
                  </button>
               ))}
            </div>
         )}
      </div>
   );
};

const MobileMegaDropdown = ({ category, onClose }: any) => {
   const [data, setData] = useState<any>(null);
   useEffect(() => {
      getMegaDropdown(category.toLowerCase().replace('-', '')).then(res => setData(res)).catch(() => {});
   }, [category]);

   if (!data?.columns) return <div className="p-4 text-sm">Loading...</div>;

   return (
      <div className="p-4">
         {data.columns.map((col: any, i: number) => (
            <MobileColumn key={i} col={col} category={category} onClose={onClose} />
         ))}
      </div>
   );
};

const DesktopMegaDropdown = ({ category }: { category: string }) => {
  const [data, setData] = useState<any>(null);
  
  useEffect(() => {
     let active = true;
     getMegaDropdown(category.toLowerCase().replace('-', '')).then(res => {
        if (active) setData(res);
     }).catch(() => {});
     return () => { active = false; };
  }, [category]);

  if (!data?.columns?.length) return null;

  return (
    <div className="absolute top-full left-0 right-0 w-full bg-white shadow-xl border-t border-[var(--border)] z-50 animate-fade-in py-8 px-12 pb-12">
      <div className="max-w-7xl mx-auto flex gap-12">
        {data.columns.map((col: any, idx: number) => (
          <div key={idx} className="min-w-[160px]">
             <h4 className="font-semibold text-sm text-[var(--text-primary)] mb-4">{col.header}</h4>
             <ul className="space-y-3">
                {col.items?.map((item: any, i: number) => (
                   <li key={i}>
                      <Link href={`/products?category=${category.toLowerCase()}&${item.filterKey}=${item.filterValue}`} className="text-sm text-[var(--text-secondary)] hover:text-[var(--gold)] transition-colors">
                         {item.label}
                      </Link>
                   </li>
                ))}
             </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

const DynamicMegaDropdown = ({ parentSlug, subCategories }: { parentSlug: string; subCategories: any[] }) => {
  const groups = useMemo(() => {
    const map: Record<string, any[]> = {};
    subCategories.forEach((sub: any) => {
      const label = sub.megaDropdownLabel || 'Other';
      if (!map[label]) map[label] = [];
      map[label].push(sub);
    });
    return Object.entries(map);
  }, [subCategories]);

  if (groups.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 w-full bg-white shadow-xl border-t border-[var(--border)] z-50 animate-fade-in py-8 px-12 pb-12">
      <div className="max-w-7xl mx-auto flex gap-12">
        {groups.map(([header, items]) => (
          <div key={header} className="min-w-[160px]">
             <h4 className="font-semibold text-sm text-[var(--text-primary)] mb-4">{header}</h4>
             <ul className="space-y-3">
                {items.map((sub: any) => (
                   <li key={sub.slug}>
                      <Link href={`/products?category=${parentSlug}&subCategory=${sub.slug}`} className="text-sm text-[var(--text-secondary)] hover:text-[var(--gold)] transition-colors">
                         {sub.name}
                      </Link>
                   </li>
                ))}
             </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

function CatalogueHomeContent({
  products: initialProducts,
  settings,
  carouselOffers = [],
  newArrivalsInitial = { items: [], hasMore: false },
  catalogueActiveOffers = [],
  catalogueSectionsResponse = null,
}: {
  products: any[];
  settings: any;
  carouselOffers?: any[];
  newArrivalsInitial?: { items: any[]; hasMore?: boolean };
  catalogueActiveOffers?: any[];
  catalogueSectionsResponse?: { sections?: CatalogueHomeSection[] } | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [activeProducts, setActiveProducts] = useState(initialProducts || []);
  const [sidebarConfig, setSidebarConfig] = useState<any>(null);
  const [productCounts, setProductCounts] = useState<any>({});
  
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);
  const [mobileCategoryOpen, setMobileCategoryOpen] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [mobileDraftParams, setMobileDraftParams] = useState<URLSearchParams>(new URLSearchParams());

  // Dynamic categories from DB
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const categories = useMemo(() => {
    const dynamic = dbCategories.map((c: any) => ({ name: c.name, slug: c.slug, subCategories: c.subCategories || [] }));
    return [...dynamic, { name: 'Offers', slug: 'offers', subCategories: [] }, { name: 'Sale', slug: 'sale', subCategories: [] }];
  }, [dbCategories]);

  useEffect(() => { setIsMounted(true); }, []);

  // Fetch categories + sidebar config once on mount
  useEffect(() => {
     getCategories().then(res => { if (Array.isArray(res)) setDbCategories(res); }).catch(() => {});
     getSidebarConfig().then(res => setSidebarConfig(res)).catch(() => {});
  }, []);

  // Fetch counts on params change
  useEffect(() => {
     const cat = searchParams.get('category');
     getProductCounts(cat || undefined).then(res => setProductCounts(res)).catch(() => {});
  }, [searchParams]);

  // Re-fetch products when URL params change
  useEffect(() => {
     const qs = searchParams.toString();
     getProducts(qs || 'limit=60').then(res => setActiveProducts(res.products || [])).catch(() => {});
  }, [searchParams]);

  const totalItems = useCartStore((s) => s.getTotalItems());
  const { openAuthModal, user, isLoggedIn } = useAuthStore();

  const updateUrlParam = (key: string, value: string | null) => {
     const params = new URLSearchParams(searchParams.toString());
     if (value === null || value === '') params.delete(key);
     else params.set(key, value);
     router.push(`${pathname}?${params.toString()}`);
  }

  const activeFiltersCount = useMemo(() => {
     let count = 0;
     searchParams.forEach((val, key) => {
        if (key !== 'sort' && key !== 'limit' && key !== 'page') count++;
     });
     return count;
  }, [searchParams]);

  const activeFilterTags = useMemo(() => {
    const tags: {key: string; label: string, value: string}[] = [];
    searchParams.forEach((val, key) => {
       if (key === 'category') {
          tags.push({ key, label: `${val}`, value: val });
       } else if (key === 'minPrice' || key === 'maxPrice' || key === 'sort' || key === 'limit' || key === 'page') {
          // handled separately
       } else {
          const values = val.split(',');
          values.forEach(v => tags.push({ key, label: `${sidebarConfig?.filters?.find((f:any) => f.filterKey === key)?.label || key}: ${v}`, value: v }));
       }
    });
    const minP = searchParams.get('minPrice');
    const maxP = searchParams.get('maxPrice');
    if (minP || maxP) {
       tags.push({ key: 'price', label: `Under ₹${maxP || 9999}`, value: 'price' });
    }
    return tags;
  }, [searchParams, sidebarConfig]);

  const currentSort = searchParams.get('sort') || 'Relevance';

  const mergedSections = useMemo(
    () => mergeCatalogueHomeSections(catalogueSectionsResponse?.sections),
    [catalogueSectionsResponse]
  );
  const sortedSections = useMemo(
    () => [...mergedSections].sort((a, b) => a.order - b.order),
    [mergedSections]
  );
  const isHomeBrowse = !searchParams.get('category');

  const renderMarketingOnly = (section: CatalogueHomeSection) => {
    if (!section.isVisible) return null;
    if (!isHomeBrowse) return null;
    if (section.id === 'offer-carousel') {
      if (!carouselOffers?.length) return null;
      return <OfferCarousel key="offer-carousel" offers={carouselOffers} />;
    }
    if (section.id === 'new-arrivals') {
      const items = newArrivalsInitial?.items || [];
      if (!items.length) return null;
      return (
        <NewArrivalsSection
          key="new-arrivals"
          initialItems={items}
          initialHasMore={Boolean(newArrivalsInitial?.hasMore)}
        />
      );
    }
    if (section.id === 'combo-offers') {
      return <CatalogueComboOffersSection key="combo-offers" offers={catalogueActiveOffers || []} />;
    }
    return null;
  };

  const productsGridSection = mergedSections.find((s) => s.id === 'products-grid');
  const showProductGrid = productsGridSection?.isVisible !== false;

  const visibleOrdered = useMemo(
    () => sortedSections.filter((s) => s.isVisible),
    [sortedSections]
  );
  const gridIdx = visibleOrdered.findIndex((s) => s.id === 'products-grid');
  const sectionsBeforeGrid = gridIdx >= 0 ? visibleOrdered.slice(0, gridIdx) : visibleOrdered;
  const sectionsAfterGrid = gridIdx >= 0 ? visibleOrdered.slice(gridIdx + 1) : [];

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--text-primary)] font-sans pb-16 md:pb-0">
      
      {/* SECTION 1 — TOP UTILITY BAR (Desktop) */}
      <div className="hidden md:flex bg-[var(--navbar-bg)] text-white text-[11px] font-medium tracking-wide h-[36px] items-center justify-between px-6">
        <div className="flex items-center">
          <div className="flex items-center gap-2 px-3"><Truck/> <span>Free Delivery Above ₹999</span></div>
          <span className="opacity-20">|</span>
          <div className="flex items-center gap-2 px-3"><Store/> <span>Visit Our Store</span></div>
          <span className="opacity-20">|</span>
          <div className="flex items-center gap-2 px-3"><Phone/> <span>WhatsApp Us</span></div>
        </div>
        <Link href="/help" className="px-3 hover:text-[var(--gold)] transition-colors">Help & Policies</Link>
      </div>

      <div className="sticky top-0 z-50 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        {/* SECTION 2 — MAIN NAVBAR */}
        <div className="border-b border-[var(--border)]">
          <div className="max-w-[1600px] mx-auto px-4 md:px-8 h-[60px] md:h-[72px] flex items-center justify-between gap-4 md:gap-8">
            
            <div className="flex items-center flex-shrink-0">
               <button className="md:hidden p-2 -ml-2 mr-2" onClick={() => setMobileCategoryOpen(categories[0]?.slug || null)}>
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
               </button>
               <Link href="/" className="flex items-center justify-center rounded-sm overflow-hidden">
                 <Image src="/sowaatlogo.jpeg" alt="SoWhat Menswear Logo" width={48} height={48} className="object-cover w-10 h-10 md:w-12 md:h-12" />
               </Link>
            </div>

            <div className="flex-1 max-w-2xl relative" onBlur={(e) => {
               if (!e.currentTarget.contains(e.relatedTarget)) setTimeout(() => setSearchFocused(false), 200);
            }}>
               <div className="relative">
                 <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                 <input 
                   type="text" 
                   placeholder="What are you looking for?" 
                   className="w-full pl-12 pr-4 py-2 h-[40px] md:h-[44px] bg-[var(--surface)] border-none focus:outline-none focus:ring-1 focus:ring-[var(--gold)] rounded-sm text-sm"
                   onFocus={() => setSearchFocused(true)}
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                 />
               </div>
            </div>

            <div className="flex items-center gap-5 md:gap-7 flex-shrink-0">
               {isLoggedIn && user ? (
                 <Link
                   href="/account"
                   className="flex items-center justify-center gap-2 rounded-sm bg-[var(--gold)] px-3 h-[40px] md:h-[44px] text-black hover:opacity-90 transition-opacity"
                   title="My account"
                 >
                   <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/10 text-[10px] font-bold uppercase">
                     {user.avatar ? (
                       <img src={user.avatar} alt="" className="h-full w-full object-cover" />
                     ) : (
                       userInitials(user)
                     )}
                   </span>
                   <span className="hidden text-left text-[13px] font-semibold leading-tight sm:block max-w-[6.5rem] truncate normal-case">
                     {userFirstName(user)}
                   </span>
                 </Link>
               ) : (
                 <>
                   <button
                     type="button"
                     onClick={() => openAuthModal()}
                     className="md:hidden rounded-sm border border-[var(--border)] px-3 py-2 text-xs font-bold uppercase tracking-wide text-[var(--text-primary)]"
                   >
                     Sign in
                   </button>
                   <button
                     type="button"
                     onClick={() => openAuthModal()}
                     className="hidden md:block bg-[var(--gold)] text-black uppercase font-semibold px-6 h-[44px] text-[13px] tracking-wide hover:opacity-90 transition-opacity rounded-sm"
                   >
                     Sign In
                   </button>
                 </>
               )}
               
               <Link href="/account?tab=wishlist" className="hidden md:flex flex-col items-center gap-[4px] text-[var(--text-secondary)] hover:text-black">
                 <HeartIcon size={22} className="text-black" />
                 <span className="text-[10px] uppercase font-bold tracking-widest leading-none">FAVS</span>
               </Link>
               
               <Link href="/cart" className="flex md:flex-col items-center gap-[4px] text-[var(--text-secondary)] hover:text-black relative">
                 <div className="relative">
                   <BagIcon size={22} className="text-black" />
                   {isMounted && totalItems > 0 && (
                     <span className="absolute -top-[4px] -right-[6px] bg-[var(--sale-red)] text-white text-[10px] w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold">
                       {totalItems}
                     </span>
                   )}
                 </div>
                 <span className="hidden md:block text-[10px] uppercase font-bold tracking-widest leading-none">BAG</span>
               </Link>

               <button className="hidden md:flex flex-col items-center gap-[4px] text-[var(--text-secondary)] hover:text-black">
                 <MoreIcon size={22} className="text-black" />
                 <span className="text-[10px] uppercase font-bold tracking-widest leading-none">MORE</span>
               </button>
            </div>
          </div>
        </div>

        {/* SECTION 3 — CATEGORY NAV */}
        <div className="hidden md:block relative bg-white border-b border-[var(--border)]" onMouseLeave={() => setHoveredCategory(null)}>
           <div className="max-w-[1600px] mx-auto flex justify-center h-[50px] gap-8">
              {categories.map(cat => (
                 <Link 
                   href={`/products?category=${cat.slug}`}
                   key={cat.slug} 
                   className={cn(
                     "px-2 flex items-center text-[13px] font-bold uppercase tracking-widest transition-colors border-b-2",
                     searchParams.get('category') === cat.slug ? "text-[var(--gold)] border-[var(--gold)]" : "text-[var(--text-primary)] border-transparent hover:text-[var(--gold)] hover:border-[var(--gold)]"
                   )}
                   onMouseEnter={() => setHoveredCategory(cat.slug)}
                 >
                   {cat.name}
                 </Link>
              ))}
           </div>
           {hoveredCategory && (() => { const found = categories.find(c => c.slug === hoveredCategory); return found && found.subCategories?.length > 0 ? <DynamicMegaDropdown parentSlug={found.slug} subCategories={found.subCategories} /> : null; })()}
        </div>
        
        {/* Mobile Category Nav Row */}
        <div className="md:hidden flex items-center gap-6 overflow-x-auto px-4 py-3 bg-white border-b border-[var(--border)] no-scrollbar">
           {categories.map(cat => (
              <button 
                key={cat.slug} 
                className={cn("whitespace-nowrap font-bold text-xs uppercase tracking-wider", searchParams.get('category') === cat.slug ? "text-[var(--gold)]" : "text-[var(--text-secondary)]")} 
                onClick={() => setMobileCategoryOpen(cat.slug)}
              >
                 {cat.name}
              </button>
           ))}
        </div>
      </div>

      {sectionsBeforeGrid.map((section) => renderMarketingOnly(section))}

      {showProductGrid && (
      <>
      <main className="max-w-[1600px] mx-auto py-6 md:py-8 px-4 md:px-8 flex flex-col md:flex-row gap-8">
         
         {/* Left Sidebar (Desktop) */}
         <aside className="hidden md:block w-[240px] shrink-0 sticky top-[180px] self-start border-r border-[var(--border)] pr-8 min-h-[500px]">
             <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold uppercase tracking-widest text-sm text-[var(--text-primary)]">Filters</h3>
                {activeFiltersCount > 0 && (
                   <button onClick={() => router.push(pathname)} className="text-[var(--gold)] text-xs font-bold uppercase tracking-wider hover:underline">Clear all</button>
                )}
             </div>

             {sidebarConfig?.filters?.filter((f: any) => f.isVisible).sort((a: any, b: any) => a.order - b.order).map((filter: any) => {
                 if (filter.type === 'range_slider') {
                    return <RangeSliderFilter 
                      key={filter.id} 
                      filter={filter} 
                      minPrice={searchParams.get('minPrice')} 
                      maxPrice={searchParams.get('maxPrice')} 
                      onChange={(min:string, max:string) => {
                         const p = new URLSearchParams(searchParams.toString());
                         if(min) p.set('minPrice', min); else p.delete('minPrice');
                         if(max) p.set('maxPrice', max); else p.delete('maxPrice');
                         router.push(`${pathname}?${p.toString()}`);
                      }}
                    />
                 }
                 if (filter.type === 'checkbox_list') {
                    return <CheckboxListFilter 
                      key={filter.id} 
                      filter={filter} 
                      activeValues={searchParams.get(filter.filterKey) ? searchParams.get(filter.filterKey)!.split(',') : []} 
                      productCounts={productCounts?.[filter.filterKey] || {}} 
                      onChange={(vals: string[]) => {
                         const p = new URLSearchParams(searchParams.toString());
                         if (vals.length) p.set(filter.filterKey, vals.join(','));
                         else p.delete(filter.filterKey);
                         router.push(`${pathname}?${p.toString()}`);
                      }} 
                    />
                 }
                 return null;
             })}
         </aside>

         {/* Product Area */}
         <div className="flex-1 min-w-0">
             
             {/* Header Row */}
             <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
               <div>
                  {searchParams.get('category') && (
                     <h1 className="text-2xl md:text-3xl font-playfair font-bold uppercase tracking-widest text-[var(--text-primary)] mb-2">
                                                 {(() => { const m: Record<string, string> = { tshirt:'T-SHIRTS', shirt:'SHIRTS', pant:'PANTS', tshirts:'T-SHIRTS', shirts:'SHIRTS', pants:'PANTS' }; return m[searchParams.get('category')!.toLowerCase()] || searchParams.get('category')!.toUpperCase(); })()}
                     </h1>
                  )}
                  <div className="text-sm text-[var(--text-secondary)] font-medium">Showing {activeProducts.length} products</div>
               </div>
               
               {/* Sort Select */}
               <div className="hidden md:flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">Sort By</span>
                  <div className="relative">
                     <select 
                       className="appearance-none border border-[var(--border)] rounded-sm px-4 py-2.5 pr-10 text-sm font-semibold bg-white focus:outline-none focus:border-[var(--gold)] cursor-pointer"
                       value={currentSort}
                       onChange={e => updateUrlParam('sort', e.target.value)}
                     >
                       <option value="Relevance">Relevance</option>
                       <option value="price_asc">Price: Low to High</option>
                       <option value="price_desc">Price: High to Low</option>
                       <option value="newest">Newest First</option>
                       <option value="discount">Discount</option>
                     </select>
                     <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-secondary)]" width="12" height="auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
               </div>
             </div>

             {/* Active Filter Tags */}
             {activeFilterTags.length > 0 && (
                <div className="flex md:flex-wrap gap-2 mb-8 items-center overflow-x-auto no-scrollbar pb-2 md:pb-0">
                   {activeFilterTags.map(tag => (
                      <div key={tag.key + tag.value} className="flex items-center shrink-0 border border-[var(--gold)] text-[var(--gold)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-[var(--surface)]">
                        {tag.label}
                        <button onClick={() => {
                           const p = new URLSearchParams(searchParams.toString());
                           if (tag.key === 'price') { p.delete('minPrice'); p.delete('maxPrice'); }
                           else if (tag.key === 'category') { p.delete('category'); }
                           else {
                              const existing = p.get(tag.key) ? p.get(tag.key)!.split(',') : [];
                              const filtered = existing.filter(e => e !== tag.value);
                              if (filtered.length > 0) p.set(tag.key, filtered.join(','));
                              else p.delete(tag.key);
                           }
                           router.push(`${pathname}?${p.toString()}`);
                        }} className="ml-2 hover:text-black">✕</button>
                      </div>
                   ))}
                   <button onClick={() => router.push(pathname)} className="text-xs shrink-0 text-[var(--text-secondary)] hover:text-black font-semibold underline underline-offset-2 ml-2 uppercase tracking-wide py-2">
                      Clear All
                   </button>
                </div>
             )}

             {/* Product Grid */}
             {activeProducts.length === 0 ? (
                <div className="py-20 text-center">
                   <h3 className="text-xl font-medium text-[var(--text-secondary)]">No products match your filters.</h3>
                   <button onClick={() => router.push(pathname)} className="mt-4 border border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-white px-6 py-2 uppercase font-bold text-sm tracking-wider transition-colors inline-block">Reset Filters</button>
                </div>
             ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-[2px] bg-[var(--border)] border border-[var(--border)]">
                   {activeProducts.map((product: any, idx: number) => (
                     <div key={product._id || idx} className="bg-white hover:z-20 relative p-3 md:p-5 group/card transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
                        <CatalogueProductCard product={product} />
                     </div>
                   ))}
                </div>
             )}
         </div>
      </main>

      {/* MOBILE RESPONSIVE NAV BOTTOM ROW */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--border)] z-40 flex shadow-[0_-4px_15px_-5px_rgba(0,0,0,0.08)]">
         <button onClick={() => { setMobileDraftParams(new URLSearchParams(searchParams.toString())); setMobileFilterOpen(true); }} className="flex-1 flex items-center justify-center gap-2 py-4 border-r border-[var(--border)] active:bg-gray-50 h-[56px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <span className="text-xs font-bold uppercase tracking-widest">Filter {activeFiltersCount > 0 && <span className="bg-[var(--gold)] text-black w-5 h-5 rounded-full inline-flex items-center justify-center ml-1 text-[10px]">{activeFiltersCount}</span>}</span>
         </button>
         <button onClick={() => setMobileSortOpen(true)} className="flex-1 flex items-center justify-center gap-2 py-4 active:bg-gray-50 h-[56px]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
            <span className="text-xs font-bold uppercase tracking-widest">Sort</span>
         </button>
      </div>

       {/* Mobile Category Full Sheet */}
       {mobileCategoryOpen && (
          <div className="md:hidden fixed inset-0 bg-white z-[120] flex flex-col animate-slide-in-right">
             <div className="flex items-center p-4 border-b border-[var(--border)] gap-4 sticky top-0 bg-white z-10 shadow-sm">
                <button onClick={() => setMobileCategoryOpen(null)} className="p-2 -ml-2 text-gray-500 hover:text-black">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                </button>
                <h3 className="font-bold text-sm uppercase tracking-widest">{categories.find(c => c.slug === mobileCategoryOpen)?.name || mobileCategoryOpen}</h3>
             </div>
             <div className="flex-1 overflow-y-auto w-full pb-safe">
                {(() => { const found = categories.find(c => c.slug === mobileCategoryOpen); if (!found?.subCategories?.length) return <div className="p-4 text-sm text-[var(--text-secondary)]">No subcategories</div>; const groups: Record<string, any[]> = {}; found.subCategories.forEach((sub: any) => { const l = sub.megaDropdownLabel || 'Other'; if (!groups[l]) groups[l] = []; groups[l].push(sub); }); return <div className="p-4">{Object.entries(groups).map(([h, items]) => <div key={h} className="border-b border-[var(--border)] last:border-0"><h4 className="py-4 text-sm font-bold uppercase tracking-wider">{h}</h4><div className="pb-4 space-y-3 pl-2">{items.map((s: any) => <button key={s.slug} className="block text-sm text-[var(--text-secondary)] w-full text-left py-2" onClick={() => { setMobileCategoryOpen(null); router.push(`/products?category=${found.slug}&subCategory=${s.slug}`); }}>{s.name}</button>)}</div></div>)}</div>; })()}
             </div>
          </div>
       )}

       {/* Mobile Filter Bottom Sheet */}
       {mobileFilterOpen && (
        <div className="md:hidden fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/60 transition-opacity" onClick={() => setMobileFilterOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl h-[85vh] flex flex-col transform transition-transform animate-slide-up pb-safe">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)] shrink-0">
              <h3 className="font-bold text-sm uppercase tracking-widest text-[var(--text-primary)]">Filters</h3>
              <div className="flex items-center gap-4">
                 <button onClick={() => setMobileDraftParams(new URLSearchParams())} className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Clear all</button>
                 <button onClick={() => setMobileFilterOpen(false)} className="p-1 -mr-1 text-gray-500"><CloseIcon size={20}/></button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-5 py-2 overscroll-contain touch-pan-y">
               {sidebarConfig?.filters?.filter((f: any) => f.isVisible).sort((a: any, b: any) => a.order - b.order).map((filter: any) => {
                   if (filter.type === 'range_slider') {
                      return <RangeSliderFilter 
                        key={"mob"+filter.id} 
                        filter={filter} 
                        minPrice={mobileDraftParams.get('minPrice')} 
                        maxPrice={mobileDraftParams.get('maxPrice')} 
                        onChange={(min:string, max:string) => {
                           const p = new URLSearchParams(mobileDraftParams.toString());
                           if(min) p.set('minPrice', min); else p.delete('minPrice');
                           if(max) p.set('maxPrice', max); else p.delete('maxPrice');
                           setMobileDraftParams(p);
                        }}
                      />
                   }
                   if (filter.type === 'checkbox_list') {
                      return <CheckboxListFilter 
                        key={"mob"+filter.id} 
                        filter={filter} 
                        activeValues={mobileDraftParams.get(filter.filterKey) ? mobileDraftParams.get(filter.filterKey)!.split(',') : []} 
                        productCounts={productCounts?.[filter.filterKey] || {}} 
                        onChange={(vals: string[]) => {
                           const p = new URLSearchParams(mobileDraftParams.toString());
                           if (vals.length) p.set(filter.filterKey, vals.join(','));
                           else p.delete(filter.filterKey);
                           setMobileDraftParams(p);
                        }} 
                      />
                   }
                   return null;
               })}
            </div>
            
            <div className="shrink-0 p-4 bg-white border-t border-[var(--border)] shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
              <button 
                type="button"
                onClick={() => {
                   const q = mobileDraftParams.toString();
                   router.push(q ? `${pathname}?${q}` : pathname);
                   setMobileFilterOpen(false);
                }} 
                className="w-full bg-[var(--gold)] h-[54px] font-bold uppercase tracking-widest text-sm rounded-sm text-black hover:opacity-90 active:scale-95 transition-all touch-manipulation"
              >
                APPLY FILTERS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Sort Bottom Sheet */}
      {mobileSortOpen && (
        <div className="md:hidden fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/60 transition-opacity" onClick={() => setMobileSortOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl flex flex-col transform transition-transform animate-slide-up pb-safe">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
              <h3 className="font-bold text-sm uppercase tracking-widest text-[var(--text-primary)]">Sort By</h3>
              <button onClick={() => setMobileSortOpen(false)} className="p-1 -mr-1 text-gray-500"><CloseIcon size={20}/></button>
            </div>
            <div className="p-4 flex flex-col pb-8">
              {[
                  {label: 'Relevance', value: 'Relevance'}, 
                  {label: 'Price: Low to High', value: 'price_asc'}, 
                  {label: 'Price: High to Low', value: 'price_desc'}, 
                  {label: 'Newest First', value: 'newest'},
                  {label: 'Discount', value: 'discount'}
              ].map((sort) => (
                <button 
                  key={sort.value} 
                  onClick={() => { updateUrlParam('sort', sort.value); setMobileSortOpen(false); }} 
                  className="py-4 px-2 flex items-center justify-between text-left font-bold text-sm tracking-wide border-b border-[var(--border)] last:border-0 hover:text-[var(--gold)] transition-colors"
                >
                  {sort.label}
                  {currentSort === sort.value && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {sectionsAfterGrid.map((section) => renderMarketingOnly(section))}

    </div>
  );
}

export default function CatalogueHome(props: any) {
   return (
      <Suspense fallback={null}>
         <CatalogueHomeContent {...props} />
      </Suspense>
   );
}
