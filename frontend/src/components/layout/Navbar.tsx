'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useCartStore } from '@/lib/cart-store';
import { useAuthStore } from '@/lib/auth-store';
import { User as UserIcon } from 'lucide-react';
interface NavbarProps {
  variant?: 'default' | 'minimal' | 'catalogue';
}

export default function Navbar({ variant = 'default' }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const totalItems = useCartStore((s) => s.getTotalItems());
  const { user, isLoggedIn, openAuthModal, logout } = useAuthStore();
  useEffect(() => {
    setIsMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Minimal navbar for Magazine homepage
  if (variant === 'minimal') {
    return (
      <>
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-transparent'
        }`}>
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button className="md:hidden p-2 -ml-2" onClick={() => setMenuOpen(!menuOpen)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </button>
              <Link href="/" className="flex-shrink-0">
                <Image src="/sowaatlogo.jpeg" alt="SoWhat Menswear Logo" width={50} height={50} className="object-contain" />
              </Link>
            </div>
            <div className="flex items-center gap-5">
              <Link href="/orders" className="hidden md:block text-xs font-bold uppercase tracking-widest hover:text-[var(--gold)] transition-colors">My Orders</Link>
              <button onClick={() => setSearchOpen(!searchOpen)} className="hover:text-[var(--gold)] transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
              
              <div className="relative">
                {isLoggedIn && user ? (
                  <button onClick={() => setDropdownOpen(!dropdownOpen)} className="w-8 h-8 rounded-full bg-[var(--gold)] text-black font-bold flex items-center justify-center uppercase text-sm">
                    {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover" alt={user.name} /> : user.name.charAt(0)}
                  </button>
                ) : (
                  <button onClick={() => openAuthModal('login')} className="hover:text-[var(--gold)] transition-colors mt-1">
                    <UserIcon size={20} />
                  </button>
                )}
                {dropdownOpen && isLoggedIn && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 border border-[var(--border)] z-50">
                     <div className="px-4 py-2 border-b border-[var(--border)] text-sm font-semibold text-black">
                       Hi, {user?.name.split(' ')[0]}! 👋
                     </div>
                     <Link href="/account" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--gold)]">📦 My Orders</Link>
                     <Link href="/account?tab=wishlist" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--gold)]">❤ Wishlist</Link>
                     <Link href="/account?tab=addresses" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--gold)]">📍 Addresses</Link>
                     <button onClick={() => { logout(); setDropdownOpen(false); fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/logout`, { method: 'POST' }) }} className="w-full text-left block px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--gold)] border-t border-[var(--border)]">
                       Logout
                     </button>
                  </div>
                )}
              </div>

              <Link href="/cart" className="relative hover:text-[var(--gold)] transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                {isMounted && totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[var(--gold)] text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </nav>
        {/* Mobile Menu Drawer (Minimal) */}
        <div className={`fixed inset-0 z-[100] transition-opacity duration-300 md:hidden ${menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          <div className={`absolute top-0 left-0 w-[80%] max-w-[300px] h-full bg-white transform transition-transform duration-300 ease-in-out flex flex-col ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <Image src="/sowaatlogo.jpeg" alt="SoWhat Menswear Logo" width={40} height={40} className="object-contain" />
              <button onClick={() => setMenuOpen(false)} className="p-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
              <Link href="/products" className="flex items-center justify-between text-base font-medium" onClick={() => setMenuOpen(false)}>Shop All <span>→</span></Link>
              <hr className="border-[var(--border)] my-6" />
              <Link href="/orders" className="block text-base text-[var(--text-secondary)]" onClick={() => setMenuOpen(false)}>📦 My Orders</Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white shadow-md' : 'bg-white border-b border-[var(--border)]'
      }`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16 md:h-18">
            {/* Left links - Desktop */}
            <div className="hidden md:flex items-center gap-8">
              <Link href="/products?category=tshirt" className="text-xs font-semibold tracking-widest uppercase text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                T-Shirts
              </Link>
              <Link href="/products?category=shirt" className="text-xs font-semibold tracking-widest uppercase text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Shirts
              </Link>
              <Link href="/products?category=pant" className="text-xs font-semibold tracking-widest uppercase text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                Pants
              </Link>
              <Link href="/offers" className="text-xs font-semibold tracking-widest uppercase text-[var(--gold)] hover:text-[var(--gold-hover)] transition-colors">
                Offers
              </Link>
            </div>

            {/* Mobile hamburger - Left */}
            <button className="md:hidden p-2 -ml-2" onClick={() => setMenuOpen(!menuOpen)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>

            {/* Logo - Center */}
            <Link href="/" className="absolute left-1/2 -translate-x-1/2 text-center w-full max-w-[200px] md:max-w-none flex justify-center">
              <Image src="/sowaatlogo.jpeg" alt="SoWhat Menswear Logo" width={80} height={50} className="object-contain h-10 w-auto md:h-12" />
            </Link>

            {/* Right icons */}
            <div className="flex items-center gap-4">
              {/* Search */}
              <button onClick={() => setSearchOpen(!searchOpen)} className="block md:hidden hover:text-[var(--gold)] transition-colors p-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
              <button onClick={() => setSearchOpen(!searchOpen)} className="hidden md:block hover:text-[var(--gold)] transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
              
              <div className="relative">
                {isLoggedIn && user ? (
                  <button onClick={() => setDropdownOpen(!dropdownOpen)} className="w-8 h-8 rounded-full bg-[var(--gold)] text-black font-bold flex items-center justify-center uppercase text-sm">
                    {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover" alt={user.name} /> : user.name.charAt(0)}
                  </button>
                ) : (
                  <button onClick={() => openAuthModal('login')} className="hover:text-[var(--gold)] transition-colors mt-1">
                    <UserIcon size={20} />
                  </button>
                )}
                {dropdownOpen && isLoggedIn && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 border border-[var(--border)] z-50">
                     <div className="px-4 py-2 border-b border-[var(--border)] text-sm font-semibold text-black">
                       Hi, {user?.name.split(' ')[0]}! 👋
                     </div>
                     <Link href="/account" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--gold)]">📦 My Orders</Link>
                     <Link href="/account?tab=wishlist" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--gold)]">❤ Wishlist</Link>
                     <Link href="/account?tab=addresses" onClick={() => setDropdownOpen(false)} className="block px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--gold)]">📍 Addresses</Link>
                     <button onClick={() => { logout(); setDropdownOpen(false); fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/logout`, { method: 'POST' }) }} className="w-full text-left block px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-gray-50 hover:text-[var(--gold)] border-t border-[var(--border)]">
                       Logout
                     </button>
                  </div>
                )}
              </div>

              {/* Cart */}
              <Link href="/cart" className="relative hover:text-[var(--gold)] transition-colors mt-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
                {isMounted && totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[var(--gold)] text-black text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-fade-in">
                    {totalItems}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>

        {/* Search Bar - Expandable */}
        {searchOpen && (
          <div className="border-t border-[var(--border)] p-4 animate-fade-in">
            <div className="max-w-xl mx-auto relative">
              <input
                type="text"
                placeholder="Search products..."
                autoFocus
                className="w-full px-4 py-3 border border-[var(--border)] rounded-lg focus:outline-none focus:border-[var(--gold)] text-sm"
              />
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </button>
            </div>
          </div>
        )}

        {/* Mobile Menu Drawer */}
        <div className={`fixed inset-0 z-[100] transition-opacity duration-300 md:hidden ${menuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          {/* Dark Overlay */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setMenuOpen(false)} />
          
          {/* Drawer Content */}
          <div className={`absolute top-0 left-0 w-[80%] max-w-[300px] h-full bg-white transform transition-transform duration-300 ease-in-out flex flex-col ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <Image src="/sowaatlogo.jpeg" alt="SoWhat Menswear Logo" width={40} height={40} className="object-contain" />
              <button onClick={() => setMenuOpen(false)} className="p-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
              <Link href="/products?category=tshirt" className="flex items-center justify-between text-base font-medium" onClick={() => setMenuOpen(false)}>
                T-Shirts <span>→</span>
              </Link>
              <Link href="/products?category=shirt" className="flex items-center justify-between text-base font-medium" onClick={() => setMenuOpen(false)}>
                Shirts <span>→</span>
              </Link>
              <Link href="/products?category=pant" className="flex items-center justify-between text-base font-medium" onClick={() => setMenuOpen(false)}>
                Pants <span>→</span>
              </Link>
              <Link href="/offers" className="flex items-center justify-between text-base font-medium text-[var(--gold)]" onClick={() => setMenuOpen(false)}>
                Offers <span>→</span>
              </Link>
              
              <hr className="border-[var(--border)] my-6" />
              
              <Link href="/orders" className="block text-base text-[var(--text-secondary)] hover:text-[var(--gold)] transition-colors" onClick={() => setMenuOpen(false)}>
                📦 My Orders
              </Link>
              <Link href="/contact" className="block text-base text-[var(--text-secondary)] hover:text-[var(--gold)] transition-colors" onClick={() => setMenuOpen(false)}>
                Contact Us
              </Link>
            </div>

            <div className="p-6 border-t border-[var(--border)]">
              <a href="https://wa.me/911234567890" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 font-medium">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-669-.51h-.573c-.199 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
