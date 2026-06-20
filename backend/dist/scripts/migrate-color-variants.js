"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Migrates embedded product.colors[] into ProductVariant records.
 * Backs up products + productvariants collections before running.
 *
 * Usage: npm run migrate-color-variants
 */
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
const slugify_1 = __importDefault(require("slugify"));
const Product_1 = __importDefault(require("../models/Product"));
const ProductVariant_1 = __importDefault(require("../models/ProductVariant"));
const BACKUP_DIR = path_1.default.join(__dirname, '..', '..', 'backups');
async function backupCollection(name) {
    if (!mongoose_1.default.connection.db)
        throw new Error('No DB connection');
    const docs = await mongoose_1.default.connection.db.collection(name).find({}).toArray();
    if (!fs_1.default.existsSync(BACKUP_DIR))
        fs_1.default.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path_1.default.join(BACKUP_DIR, `${name}-${stamp}.json`);
    fs_1.default.writeFileSync(filePath, JSON.stringify(docs, null, 2));
    console.log(`✅ Backed up ${docs.length} ${name} docs → ${filePath}`);
    return filePath;
}
function reorderImagesForColor(allImages, imageIndex) {
    if (!allImages.length)
        return [];
    if (imageIndex == null || imageIndex < 0 || imageIndex >= allImages.length)
        return [...allImages];
    const primary = allImages[imageIndex];
    const rest = allImages.filter((_, i) => i !== imageIndex);
    return [primary, ...rest];
}
async function uniqueSlug(baseSlug, colorName, used) {
    let candidate = `${baseSlug}-${(0, slugify_1.default)(colorName, { lower: true, strict: true })}`;
    let n = 1;
    while (used.has(candidate) || (await ProductVariant_1.default.findOne({ slug: candidate }))) {
        n += 1;
        candidate = `${baseSlug}-${(0, slugify_1.default)(colorName, { lower: true, strict: true })}-${n}`;
    }
    used.add(candidate);
    return candidate;
}
async function migrate() {
    if (!process.env.MONGODB_URI) {
        console.error('MONGODB_URI is not set. Skipping migration.');
        process.exit(1);
    }
    await mongoose_1.default.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    await backupCollection('products');
    const existingVariants = await ProductVariant_1.default.countDocuments();
    if (existingVariants > 0) {
        await backupCollection('productvariants');
    }
    const products = await Product_1.default.find({}).lean();
    let variantsCreated = 0;
    let productsUpdated = 0;
    const usedSlugs = new Set();
    for (const product of products) {
        const existingForProduct = await ProductVariant_1.default.countDocuments({ parentProductId: product._id });
        if (existingForProduct > 0) {
            console.log(`⏭  Skipping ${product.name} — already has ${existingForProduct} variant(s)`);
            continue;
        }
        const baseSlug = product.slug || (0, slugify_1.default)(product.name, { lower: true, strict: true });
        const colors = product.colors || [];
        const allImages = product.images || [];
        if (colors.length > 0) {
            let firstVariantId = null;
            for (let i = 0; i < colors.length; i++) {
                const color = colors[i];
                const slug = await uniqueSlug(baseSlug, color.name, usedSlugs);
                const images = reorderImagesForColor(allImages, color.imageIndex);
                const variant = await ProductVariant_1.default.create({
                    parentProductId: product._id,
                    slug,
                    colorName: color.name,
                    colorHex: color.hex || '#000000',
                    images: images.length ? images : allImages,
                    sortOrder: i,
                    isActive: product.isActive !== false,
                });
                if (!firstVariantId)
                    firstVariantId = variant._id;
                variantsCreated += 1;
            }
            if (firstVariantId) {
                await Product_1.default.findByIdAndUpdate(product._id, { defaultVariantId: firstVariantId });
                productsUpdated += 1;
            }
            console.log(`✅ ${product.name}: ${colors.length} color variant(s)`);
        }
        else {
            // Single default variant — keeps same slug as parent for URL compatibility
            const slug = usedSlugs.has(baseSlug)
                ? await uniqueSlug(baseSlug, 'default', usedSlugs)
                : (usedSlugs.add(baseSlug), baseSlug);
            const variant = await ProductVariant_1.default.create({
                parentProductId: product._id,
                slug,
                colorName: 'Default',
                colorHex: '#000000',
                images: allImages,
                sortOrder: 0,
                isActive: product.isActive !== false,
            });
            await Product_1.default.findByIdAndUpdate(product._id, { defaultVariantId: variant._id });
            variantsCreated += 1;
            productsUpdated += 1;
            console.log(`✅ ${product.name}: default variant (${slug})`);
        }
    }
    console.log('\n--- Migration complete ---');
    console.log(`Products updated: ${productsUpdated}`);
    console.log(`Variants created: ${variantsCreated}`);
    await mongoose_1.default.disconnect();
}
migrate().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
//# sourceMappingURL=migrate-color-variants.js.map