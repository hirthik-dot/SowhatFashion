import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/shared/ProductCard';
import ProductSortSelect from './ProductSortSelect';
import { getProducts } from '@/lib/api';

export const revalidate = 60; // ISR revalidate every 60 seconds

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; sort?: string; featured?: string; newArrival?: string }>
}) {
  const resolvedSearchParams = await searchParams;
  const queryParams = new URLSearchParams(resolvedSearchParams as any).toString();
  let products = [];
  try {
    const res = await getProducts(queryParams);
    products = res.products || [];
  } catch (error) {
    console.error('Failed to load products:', error);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface)]">
      <Navbar variant="default" />
      
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-16 w-full flex-grow">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h1 className="text-3xl font-playfair font-bold uppercase tracking-widest text-[#1a1a1a]">
            {resolvedSearchParams.category
              ? (() => {
                  const catMap: Record<string, string> = { tshirt: 'T-Shirts', shirt: 'Shirts', pant: 'Pants', tshirts: 'T-Shirts', shirts: 'Shirts', pants: 'Pants' };
                  return catMap[resolvedSearchParams.category.toLowerCase()] || resolvedSearchParams.category.toUpperCase();
                })()
              : resolvedSearchParams.featured ? 'Featured'
              : resolvedSearchParams.newArrival ? 'New Arrivals'
              : 'All Products'}
          </h1>
          
          <div className="flex items-center gap-4 text-sm w-full md:w-auto">
            <span className="text-[var(--text-secondary)] whitespace-nowrap">{products.length} Products</span>
            
            <div className="w-full md:w-auto ml-auto">
              <ProductSortSelect initialSort={resolvedSearchParams.sort || ''} />
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 mb-10 pb-6 border-b border-[var(--border)] hidden md:flex">
          <a href="/products" className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border transition-colors ${!resolvedSearchParams.category ? 'bg-[var(--gold)] border-[var(--gold)] text-black' : 'bg-white border-[var(--border)] hover:border-[var(--gold)] text-[var(--text-secondary)]'}`}>Top Rated</a>
          <a href="/products?category=tshirt" className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border transition-colors ${resolvedSearchParams.category === 'tshirt' ? 'bg-[var(--gold)] border-[var(--gold)] text-black' : 'bg-white border-[var(--border)] hover:border-[var(--gold)] text-[var(--text-secondary)]'}`}>T-Shirts</a>
          <a href="/products?category=shirt" className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border transition-colors ${resolvedSearchParams.category === 'shirt' ? 'bg-[var(--gold)] border-[var(--gold)] text-black' : 'bg-white border-[var(--border)] hover:border-[var(--gold)] text-[var(--text-secondary)]'}`}>Shirts</a>
          <a href="/products?category=pant" className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border transition-colors ${resolvedSearchParams.category === 'pant' ? 'bg-[var(--gold)] border-[var(--gold)] text-black' : 'bg-white border-[var(--border)] hover:border-[var(--gold)] text-[var(--text-secondary)]'}`}>Pants</a>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-xl text-[var(--text-secondary)]">No products found for this category.</h2>
            <a href="/products" className="inline-block mt-6 btn-gold-outline">View All Products</a>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {products.map((product: any) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
