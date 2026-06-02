import ShopPageWrapper from '@/components/shop/ShopPageWrapper';
import CollectionLayout from '@/components/collection/CollectionLayout';
import { getSettings } from '@/lib/api';

export const revalidate = 60;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  let settings = null;
  try {
    settings = await getSettings();
  } catch {
    /* ignore */
  }

  const initialParams = q ? { search: q } : undefined;

  return (
    <ShopPageWrapper settings={settings}>
      <CollectionLayout
        collectionTitle={q ? `Results for "${q}"` : 'Search'}
        breadcrumbMiddle="Search"
        initialParams={initialParams}
      />
    </ShopPageWrapper>
  );
}
