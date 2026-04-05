import { getProductBySlug, getAllProductSlugs, getProducts } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/shared/ProductCard';
import ProductDetailClient from '@/app/products/[slug]/ProductDetailClient';

export const revalidate = 60; // SSG with ISR

export async function generateStaticParams() {
  try {
    const slugs = await getAllProductSlugs();
    return slugs.map((slug: string) => ({ slug }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  let product: any = null;
  let relatedProducts: any[] = [];

  try {
    product = await getProductBySlug(resolvedParams.slug);
    if (product) {
      const relatedRes = await getProducts(`category=${product.category}&limit=5`);
      // Filter out current product
      relatedProducts = (relatedRes.products || []).filter((p: any) => p._id !== product._id).slice(0, 4);
    }
  } catch (error) {
    console.error('Failed to load product details:', error);
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col pt-32 items-center bg-[var(--surface)] text-center">
        <h1 className="text-3xl font-playfair mb-4">Product Not Found</h1>
        <p className="text-[var(--text-secondary)] mb-8">The product you are looking for does not exist or has been removed.</p>
        <a href="/products" className="btn-gold-outline rounded">Go Back to Shop</a>
      </div>
    );
  }

  // Pass it down to client component for interactivity (gallery, size selection)
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar variant="default" />
      
      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 md:py-16 w-full">
        {/* Main Product Info - Client component for interactivity */}
        <ProductDetailClient product={product} />

        {/* You May Also Like */}
        {relatedProducts.length > 0 && (
          <section className="mt-24 pt-16 border-t border-[var(--border)]">
            <h2 className="text-2xl font-playfair font-bold text-center uppercase tracking-widest mb-10">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              {relatedProducts.map((p: any) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
