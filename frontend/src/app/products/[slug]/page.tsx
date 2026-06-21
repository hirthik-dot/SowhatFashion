import { redirect } from 'next/navigation';
import { getProductBySlug, getAllProductSlugs, getProducts } from '@/lib/api';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ProductCard from '@/components/shared/ProductCard';
import ProductDetailClient from '@/app/products/[slug]/ProductDetailClient';
import { productListKey } from '@/lib/utils';

export const revalidate = 60;

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
  const { slug } = await params;
  let product: any = null;
  let relatedProducts: any[] = [];

  try {
    product = await getProductBySlug(slug);
  } catch (error) {
    console.error('Failed to load product details:', error);
  }

  // Parent / legacy slug → default color or size variant (must stay outside try/catch — redirect throws)
  if (product?.redirectTo && product.redirectTo !== slug) {
    redirect(`/products/${product.redirectTo}`);
  }

  if (product?._id && !product.redirectTo) {
    try {
      const parentId = product.parentProductId || product._id;
      const relatedRes = await getProducts(`category=${product.category}&limit=8`);
      relatedProducts = (relatedRes.products || [])
        .filter((p: any) => String(p.parentProductId || p._id) !== String(parentId))
        .slice(0, 4);
    } catch (error) {
      console.error('Failed to load related products:', error);
    }
  }

  if (!product || !product._id || product.redirectTo) {
    return (
      <div className="min-h-screen flex flex-col pt-32 items-center bg-[var(--surface)] text-center">
        <h1 className="text-3xl font-playfair mb-4">Product Not Found</h1>
        <p className="text-[var(--text-secondary)] mb-8">The product you are looking for does not exist or has been removed.</p>
        <a href="/products" className="btn-gold-outline rounded">Go Back to Shop</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar variant="default" />

      <main className="flex-grow max-w-7xl mx-auto px-4 py-8 md:py-16 w-full">
        <ProductDetailClient product={product} />

        {relatedProducts.length > 0 && (
          <section className="mt-24 pt-16 border-t border-[var(--border)]">
            <h2 className="text-2xl font-playfair font-bold text-center uppercase tracking-widest mb-10">You May Also Like</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              {relatedProducts.map((p: any) => (
                <ProductCard key={productListKey(p)} product={p} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
