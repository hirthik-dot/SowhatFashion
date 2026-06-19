import Category from '../models/Category';
import { STORE_CATEGORIES } from './storeCategories';

/** Ensure all standard top-level categories exist in the database. */
export async function ensureStoreCategories(): Promise<void> {
  for (const cat of STORE_CATEGORIES) {
    const existing = await Category.findOne({ slug: cat.slug });
    if (existing) {
      if (existing.order !== cat.order) {
        await Category.updateOne({ _id: existing._id }, { order: cat.order });
      }
      continue;
    }

    await Category.create({
      name: cat.name,
      slug: cat.slug,
      parentSlug: null,
      megaDropdownLabel: cat.name,
      order: cat.order,
      isActive: true,
    });
  }
}
