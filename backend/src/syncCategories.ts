import dotenv from 'dotenv';
dotenv.config();

import connectDB from './lib/db';
import { ensureStoreCategories } from './lib/ensureStoreCategories';
import Category from './models/Category';

async function syncCategories() {
  await connectDB();
  await ensureStoreCategories();
  const topLevel = await Category.find({ parentSlug: null }).sort({ order: 1 });
  console.log(`✅ Synced ${topLevel.length} top-level categories:`);
  topLevel.forEach((c) => console.log(`   - ${c.name} (${c.slug})`));
  process.exit(0);
}

syncCategories().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
