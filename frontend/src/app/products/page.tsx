import ShopPageWrapper from '@/components/shop/ShopPageWrapper';
import CollectionLayout from '@/components/collection/CollectionLayout';
import { getSettings } from '@/lib/api';

export const revalidate = 60;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  let settings = null;
  try {
    settings = await getSettings();
  } catch {
    /* ignore */
  }

  return (
    <ShopPageWrapper settings={settings}>
      <CollectionLayout />
    </ShopPageWrapper>
  );
}
