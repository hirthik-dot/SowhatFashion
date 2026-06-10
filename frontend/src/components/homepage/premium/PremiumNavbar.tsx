'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/lib/cart-store';
import { useAuthStore } from '@/lib/auth-store';
import { getCategories } from '@/lib/api';
import { cn } from '@/lib/utils';
import { User as UserIcon } from 'lucide-react';
import { userInitials } from '@/lib/auth-user';

const CLOTHING_CATEGORIES = new Set(['tshirt', 'shirt', 'pant']);

const NAV_ITEMS = [
  { label: 'NEW IN', href: '/products?newArrival=true', mega: false },
  { label: 'CLOTHING', href: '/products', mega: true, slug: 'clothing' },
  { label: 'ACCESSORIES', href: '/collections/accessories', mega: false },
  { label: 'SALE', href: '/offers', mega: false, accent: true },
];

const DEFAULT_FEATURED =
  'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80';

const SearchIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const HeartIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);
const BagIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

function MegaMenuPanel({
  categories,
  onClose,
}: {
  categories: { name: string; slug: string; subCategories?: { name: string; slug: string; megaDropdownLabel?: string }[] }[];
  onClose: () => void;
}) {
  const clothingCats = categories.filter(
    (c) => !['offers', 'sale', 'accessories', 'accessory'].includes(c.slug) && CLOTHING_CATEGORIES.has(c.slug)
  );

  return (
    <div className="absolute top-full left-0 right-0 bg-white border-b border-[#E8E4DF] shadow-lg z-50 animate-fade-in">
      <div className="max-w-7xl mx-auto px-8 py-10 flex gap-16">
        <div className="flex gap-12 flex-1">
          {clothingCats.slice(0, 4).map((cat) => (
            <div key={cat.slug} className="min-w-[140px]">
              <h4 className="text-[11px] uppercase tracking-[0.2em] text-[#111] mb-4 font-semibold">{cat.name}</h4>
              <ul className="space-y-2">
                {(cat.subCategories?.length
                  ? cat.subCategories
                  : [
                      { name: 'View All', slug: '' },
                      { name: 'New Arrivals', slug: 'new' },
                    ]
                ).slice(0, 6).map((sub: { name: string; slug: string }) => (
                  <li key={sub.slug || sub.name}>
                    <Link
                      href={
                        sub.slug === 'new'
                          ? `/products?category=${cat.slug}&newArrival=true`
                          : sub.slug
                            ? `/products?category=${cat.slug}&subCategory=${sub.slug}`
                            : `/products?category=${cat.slug}`
                      }
                      className="text-sm text-[#6B6B6B] premium-link hover:text-[#111]"
                      onClick={onClose}
                    >
                      {sub.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="min-w-[140px]">
            <h4 className="text-[11px] uppercase tracking-[0.2em] text-[#111] mb-4 font-semibold">Shop</h4>
            <ul className="space-y-2 text-sm text-[#6B6B6B]">
              <li><Link href="/products?category=shirt" className="premium-link hover:text-[#111]" onClick={onClose}>Shirts</Link></li>
              <li><Link href="/products?category=pant" className="premium-link hover:text-[#111]" onClick={onClose}>Trousers</Link></li>
              <li><Link href="/products?category=tshirt" className="premium-link hover:text-[#111]" onClick={onClose}>T-Shirts</Link></li>
              <li><Link href="/offers" className="premium-link hover:text-[#111]" onClick={onClose}>Sale</Link></li>
            </ul>
          </div>
        </div>
        <div className="w-[280px] shrink-0 relative aspect-[4/5] bg-[#F5F5F3] overflow-hidden">
          <Image src={DEFAULT_FEATURED} alt="Featured collection" fill className="object-cover" sizes="280px" />
          <div className="absolute inset-0 bg-black/20 flex flex-col justify-end p-6">
            <p className="text-white text-[11px] uppercase tracking-[0.2em] mb-2">Featured</p>
            <Link
              href="/products"
              className="text-white text-sm uppercase tracking-[0.15em] premium-link inline-block"
              onClick={onClose}
            >
              Shop Now →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PremiumNavbar({ overHero = true }: { overHero?: boolean }) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [accordionOpen, setAccordionOpen] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const totalItems = useCartStore((s) => s.getTotalItems());
  const { user, isLoggedIn, openAuthModal, logout } = useAuthStore();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const categories = useMemo(() => {
    const dynamic = dbCategories.map((c: any) => ({
      name: c.name,
      slug: c.slug,
      subCategories: c.subCategories || [],
    }));
    return dynamic;
  }, [dbCategories]);

  useEffect(() => {
    setIsMounted(true);
    getCategories().then((res) => {
      if (Array.isArray(res)) setDbCategories(res);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      await fetch(`${apiUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
    logout();
    router.push('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  const navSolid = scrolled || !overHero;
  const textClass = navSolid ? 'text-[#111]' : 'text-white';
  const borderClass = navSolid ? 'border-[#E8E4DF] bg-white' : 'border-transparent bg-transparent';

  return (
    <>
      <header
        className={cn(
          'fixed top-[32px] left-0 right-0 z-50 transition-all duration-300',
          borderClass,
          navSolid && 'shadow-sm border-b'
        )}
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-[64px] md:h-[72px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 md:w-[180px]">
            <button
              type="button"
              className={cn('md:hidden p-2 -ml-2', textClass)}
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
            >
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-2 md:gap-3 flex-shrink-0">
              <Image
                src="/sowaatlogo.jpeg"
                alt="Sowaat Menswear Logo"
                width={40}
                height={40}
                className="object-contain h-8 w-auto md:h-9"
                priority
              />
              <span
                className={cn(
                  'font-cormorant text-[22px] md:text-[28px] font-light uppercase tracking-[0.18em]',
                  textClass
                )}
              >
                SOWAAT
              </span>
            </Link>
          </div>

          <nav
            className="hidden md:flex items-center justify-center gap-8 flex-1"
            onMouseLeave={() => setMegaOpen(false)}
          >
            {NAV_ITEMS.map((item) => (
              <div
                key={item.label}
                className="relative"
                onMouseEnter={() => item.mega && setMegaOpen(true)}
              >
                <Link
                  href={item.href}
                  className={cn(
                    'text-[11px] uppercase tracking-[0.2em] font-medium transition-colors premium-link',
                    textClass,
                    item.accent && (navSolid ? 'text-[#C0392B]' : 'text-white/90')
                  )}
                >
                  {item.label}
                </Link>
              </div>
            ))}
            {megaOpen && <MegaMenuPanel categories={categories} onClose={() => setMegaOpen(false)} />}
          </nav>

          <div className={cn('flex items-center gap-4 md:gap-5 md:w-[180px] justify-end', textClass)}>
            <button type="button" onClick={() => setSearchOpen(!searchOpen)} className="hover:opacity-70" aria-label="Search">
              <SearchIcon />
            </button>
            <Link href="/account?tab=wishlist" className="hidden sm:block hover:opacity-70" aria-label="Wishlist">
              <HeartIcon />
            </Link>
            <Link href="/cart" className="relative hover:opacity-70" aria-label="Cart">
              <BagIcon />
              {isMounted && totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-[#111] text-white text-[9px] w-4 h-4 flex items-center justify-center font-bold">
                  {totalItems}
                </span>
              )}
            </Link>
            {isLoggedIn && user ? (
              <Link
                href="/account"
                className={cn(
                  'w-8 h-8 flex items-center justify-center text-[10px] font-bold uppercase border',
                  navSolid ? 'border-[#111] text-[#111]' : 'border-white text-white'
                )}
              >
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  userInitials(user)
                )}
              </Link>
            ) : (
              <button type="button" onClick={() => openAuthModal()} className="hover:opacity-70" aria-label="Account">
                <UserIcon size={20} strokeWidth={1.5} />
              </button>
            )}
          </div>
        </div>

        {searchOpen && (
          <form onSubmit={handleSearch} className="border-t border-[#E8E4DF] px-4 py-3 bg-white">
            <input
              type="search"
              autoFocus
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-xl mx-auto block border-b border-[#111] py-2 text-sm focus:outline-none"
            />
          </form>
        )}
      </header>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-[200] md:hidden transition-opacity duration-300',
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      >
        <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
        <div
          className={cn(
            'absolute top-0 right-0 h-full w-[min(100%,320px)] bg-white flex flex-col transition-transform duration-300',
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          <div className="flex items-center justify-between p-5 border-b border-[#E8E4DF]">
            <Link href="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
              <Image src="/sowaatlogo.jpeg" alt="Sowaat Menswear Logo" width={36} height={36} className="object-contain h-8 w-auto" />
              <span className="font-cormorant text-lg font-light uppercase tracking-[0.18em]">SOWAAT</span>
            </Link>
            <button type="button" onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {NAV_ITEMS.map((item) => (
              <div key={item.label} className="border-b border-[#E8E4DF]">
                {item.mega ? (
                  <>
                    <button
                      type="button"
                      className="w-full flex justify-between items-center py-4 text-[11px] uppercase tracking-[0.2em] font-semibold"
                      onClick={() => setAccordionOpen(accordionOpen === item.label ? null : item.label)}
                    >
                      {item.label}
                      <svg
                        width={16}
                        height={16}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        className={cn('transition-transform', accordionOpen === item.label && 'rotate-180')}
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {accordionOpen === item.label && (
                      <div className="pb-4 pl-2 space-y-2">
                        {(categories.filter((c) => CLOTHING_CATEGORIES.has(c.slug)).length
                          ? categories.filter((c) => CLOTHING_CATEGORIES.has(c.slug))
                          : categories.filter((c) => !['offers', 'sale', 'accessories', 'accessory'].includes(c.slug))
                        ).map((cat) => (
                          <Link
                            key={cat.slug}
                            href={`/products?category=${cat.slug}`}
                            className="block text-sm text-[#6B6B6B] py-1"
                            onClick={() => setMenuOpen(false)}
                          >
                            {cat.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className="block py-4 text-[11px] uppercase tracking-[0.2em] font-semibold"
                    onClick={() => setMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
            <div className="pt-6 space-y-3 text-sm text-[#6B6B6B]">
              <Link href="/account" onClick={() => setMenuOpen(false)}>My Account</Link>
              <Link href="/account?tab=orders" onClick={() => setMenuOpen(false)} className="block">My Orders</Link>
              {isLoggedIn && (
                <button type="button" onClick={() => { handleLogout(); setMenuOpen(false); }} className="text-[#C0392B]">
                  Logout
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
