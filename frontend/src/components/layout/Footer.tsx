import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[var(--navbar-bg)] text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 border-b border-gray-800 pb-12 mb-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <span className="text-xl font-bold tracking-[0.15em] font-playfair">SOWAAT <span className="text-[var(--gold)]">MENS WEAR</span></span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              Premium menswear designed for the modern gentleman. Elevate your style with our curated collections.
            </p>
            <div className="flex gap-4">
              {/* Instagram */}
              <a href="#" className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center hover:bg-[var(--gold)] hover:border-[var(--gold)] hover:text-black transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              {/* WhatsApp */}
              <a href="#" className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center hover:bg-[var(--gold)] hover:border-[var(--gold)] hover:text-black transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-[var(--gold)] tracking-widest uppercase text-sm mb-6">Quick Links</h4>
            <ul className="space-y-3">
              <li><Link href="/" className="text-gray-400 hover:text-white text-sm transition-colors">Home</Link></li>
              <li><Link href="/products" className="text-gray-400 hover:text-white text-sm transition-colors">Shop All</Link></li>
              <li><Link href="/offers" className="text-gray-400 hover:text-white text-sm transition-colors">Special Offers</Link></li>
              <li><Link href="/orders" className="text-gray-400 hover:text-white text-sm transition-colors">My Orders</Link></li>
              <li><Link href="/cart" className="text-gray-400 hover:text-white text-sm transition-colors">My Cart</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-semibold text-[var(--gold)] tracking-widest uppercase text-sm mb-6">Categories</h4>
            <ul className="space-y-3">
              <li><Link href="/products?category=tshirt" className="text-gray-400 hover:text-white text-sm transition-colors">T-Shirts</Link></li>
              <li><Link href="/products?category=shirt" className="text-gray-400 hover:text-white text-sm transition-colors">Shirts</Link></li>
              <li><Link href="/products?category=pant" className="text-gray-400 hover:text-white text-sm transition-colors">Pants</Link></li>
              <li><Link href="/products?featured=true" className="text-gray-400 hover:text-white text-sm transition-colors">Featured</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-[var(--gold)] tracking-widest uppercase text-sm mb-6">Need Help?</h4>
            <ul className="space-y-3">
              <li className="text-gray-400 text-sm flex gap-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> +91 98765 43210</li>
              <li className="text-gray-400 text-sm flex gap-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> support@sowaatmenswear.com</li>
              <li className="text-gray-400 text-sm flex items-start gap-2 pt-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Chennai, Tamil Nadu, India</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>&copy; {new Date().getFullYear()} So What Menswear. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-white transition-colors">Shipping Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
