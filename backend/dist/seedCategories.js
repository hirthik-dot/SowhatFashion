"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const db_1 = __importDefault(require("./lib/db"));
const Category_1 = __importDefault(require("./models/Category"));
const storeCategories_1 = require("./lib/storeCategories");
const seedCategories = async () => {
    await (0, db_1.default)();
    console.log('✅ Connected to DB');
    // Check if categories already exist
    const existing = await Category_1.default.countDocuments();
    if (existing > 0) {
        console.log(`⚠️  ${existing} categories already exist. Skipping seed.`);
        console.log('   To re-seed, first delete all: db.categories.deleteMany({})');
        process.exit(0);
    }
    const topLevel = storeCategories_1.STORE_CATEGORIES.map((cat) => ({
        name: cat.name,
        slug: cat.slug,
        parentSlug: null,
        megaDropdownLabel: cat.name,
        order: cat.order,
    }));
    const categories = [
        ...topLevel,
        // T-Shirt subcategories
        { name: 'Round Neck', slug: 'round-neck', parentSlug: 'tshirt', megaDropdownLabel: 'By Neck Type', order: 1 },
        { name: 'Polo', slug: 'polo', parentSlug: 'tshirt', megaDropdownLabel: 'By Neck Type', order: 2 },
        { name: 'V-Neck', slug: 'v-neck', parentSlug: 'tshirt', megaDropdownLabel: 'By Neck Type', order: 3 },
        { name: 'Oversized', slug: 'oversized', parentSlug: 'tshirt', megaDropdownLabel: 'By Fit', order: 4 },
        { name: 'Slim Fit', slug: 'slim-fit-tshirt', parentSlug: 'tshirt', megaDropdownLabel: 'By Fit', order: 5 },
        // Shirt subcategories
        { name: 'Full Sleeve', slug: 'full-sleeve', parentSlug: 'shirt', megaDropdownLabel: 'By Sleeve', order: 1 },
        { name: 'Half Sleeve', slug: 'half-sleeve', parentSlug: 'shirt', megaDropdownLabel: 'By Sleeve', order: 2 },
        { name: 'Linen', slug: 'linen', parentSlug: 'shirt', megaDropdownLabel: 'By Fabric', order: 3 },
        { name: 'Cotton', slug: 'cotton-shirt', parentSlug: 'shirt', megaDropdownLabel: 'By Fabric', order: 4 },
        { name: 'Formal', slug: 'formal', parentSlug: 'shirt', megaDropdownLabel: 'By Style', order: 5 },
        { name: 'Casual', slug: 'casual-shirt', parentSlug: 'shirt', megaDropdownLabel: 'By Style', order: 6 },
        // Pant subcategories
        { name: 'Chinos', slug: 'chinos', parentSlug: 'pant', megaDropdownLabel: 'By Type', order: 1 },
        { name: 'Joggers', slug: 'joggers', parentSlug: 'pant', megaDropdownLabel: 'By Type', order: 2 },
        { name: 'Formal Trousers', slug: 'formal-trousers', parentSlug: 'pant', megaDropdownLabel: 'By Type', order: 3 },
        { name: 'Jeans', slug: 'jeans', parentSlug: 'pant', megaDropdownLabel: 'By Type', order: 4 },
        { name: 'Cargo', slug: 'cargo', parentSlug: 'pant', megaDropdownLabel: 'By Style', order: 5 },
    ];
    await Category_1.default.insertMany(categories);
    console.log(`🌱 Seeded ${categories.length} categories`);
    process.exit(0);
};
seedCategories().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
//# sourceMappingURL=seedCategories.js.map