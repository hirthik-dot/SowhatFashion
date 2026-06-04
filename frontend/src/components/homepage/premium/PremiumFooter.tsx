import Link from 'next/link';

const BRAND = 'Sowaat Menswear';

export default function PremiumFooter({ instagramHandle }: { instagramHandle?: string }) {
  const handle = instagramHandle || '@SOWAATMENSWEAR';

  return (
    <footer className="bg-[#111111] text-white">
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 border-b border-white/10 pb-12 mb-8">
          <div>
            <Link href="/" className="text-[22px] font-bold uppercase tracking-[0.15em] text-white block mb-4">
              SOWAAT
            </Link>
            <p className="text-sm text-white/60 leading-relaxed mb-6">
              Premium menswear for the modern man. Minimal silhouettes, timeless style.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-white/70 hover:text-white transition-colors" aria-label="Instagram">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="2" width="20" height="20" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              </a>
              <a href="#" className="text-white/70 hover:text-white transition-colors" aria-label="Facebook">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a href="#" className="text-white/70 hover:text-white transition-colors" aria-label="YouTube">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-2C18.88 4 12 4 12 4s-6.88 0-8.59.42a2.78 2.78 0 0 0-1.95 2 29.94 29.94 0 0 0 0 11.16 2.78 2.78 0 0 0 1.95 2C5.12 20 12 20 12 20s6.88 0 8.59-.42a2.78 2.78 0 0 0 1.95-2 29.94 29.94 0 0 0 0-11.16z" />
                  <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none" />
                </svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.2em] text-white/50 mb-6">Quick Links</h4>
            <ul className="space-y-3 text-sm text-white/70">
              <li><Link href="/" className="premium-link hover:text-white">Home</Link></li>
              <li><Link href="/products?newArrival=true" className="premium-link hover:text-white">New In</Link></li>
              <li><Link href="/products" className="premium-link hover:text-white">Collections</Link></li>
              <li><Link href="/offers" className="premium-link hover:text-white">Sale</Link></li>
              <li><Link href="/products" className="premium-link hover:text-white">About</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.2em] text-white/50 mb-6">Customer Care</h4>
            <ul className="space-y-3 text-sm text-white/70">
              <li><Link href="/track" className="premium-link hover:text-white">Track Order</Link></li>
              <li><Link href="/orders" className="premium-link hover:text-white">Returns</Link></li>
              <li><Link href="/orders" className="premium-link hover:text-white">FAQs</Link></li>
              <li><Link href="/account" className="premium-link hover:text-white">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] uppercase tracking-[0.2em] text-white/50 mb-6">Contact Info</h4>
            <ul className="space-y-3 text-sm text-white/70 mb-6">
              <li>support@sowaatmenswear.com</li>
              <li>+91 98765 43210</li>
              <li>Chennai, Tamil Nadu, India</li>
            </ul>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block border border-white text-white text-[11px] uppercase tracking-[0.15em] px-5 py-3 hover:bg-white hover:text-[#111] transition-colors"
            >
              WhatsApp Us
            </a>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[11px] text-white/40 uppercase tracking-wider">
          <p>© 2025 {BRAND} | Privacy Policy | Terms of Service</p>
          <div className="flex items-center gap-3 text-white/50">
            <span>Visa</span>
            <span>·</span>
            <span>Mastercard</span>
            <span>·</span>
            <span>UPI</span>
            <span>·</span>
            <span>WhatsApp</span>
          </div>
        </div>
        <p className="text-center text-[10px] text-white/30 mt-4 md:hidden">{handle}</p>
      </div>
    </footer>
  );
}
