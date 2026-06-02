import { redirect } from 'next/navigation';

/** /collections → all products shop */
export default function CollectionsIndexPage() {
  redirect('/products');
}
