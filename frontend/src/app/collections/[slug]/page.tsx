import ShopPageWrapper from '@/components/shop/ShopPageWrapper';
import CollectionLayout from '@/components/collection/CollectionLayout';
import { getSettings } from '@/lib/api';

export const revalidate = 60;

const SLUG_META: Record<string, { title: string; initialParams?: Record<string, string> }> = {
  shirts: { title: 'Shirts', initialParams: { category: 'shirt' } },
  trousers: { title: 'Trousers', initialParams: { category: 'pant' } },
  pants: { title: 'Trousers', initialParams: { category: 'pant' } },
  tshirts: { title: 'T-Shirts', initialParams: { category: 'tshirt' } },
  outerwear: { title: 'Outerwear', initialParams: { category: 'shirt' } },
  accessories: { title: 'Accessories', initialParams: { category: 'accessories' } },
  sale: { title: 'Sale', initialParams: {} },
  'new-arrivals': { title: 'New Arrivals', initialParams: { newArrival: 'true' } },
};

export default async function CollectionSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const key = slug.toLowerCase();
  const meta = SLUG_META[key] || {
    title: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    initialParams: {},
  };

  let settings = null;
  try {
    settings = await getSettings();
  } catch {
    /* ignore */
  }

  return (
    <ShopPageWrapper settings={settings}>
      <CollectionLayout
        collectionTitle={meta.title}
        breadcrumbMiddle="Collections"
        initialParams={meta.initialParams}
      />
    </ShopPageWrapper>
  );
}
