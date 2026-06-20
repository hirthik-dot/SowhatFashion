"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureStoreCategories = ensureStoreCategories;
const Category_1 = __importDefault(require("../models/Category"));
const storeCategories_1 = require("./storeCategories");
/** Ensure all standard top-level categories exist in the database. */
async function ensureStoreCategories() {
    for (const cat of storeCategories_1.STORE_CATEGORIES) {
        const existing = await Category_1.default.findOne({ slug: cat.slug });
        if (existing) {
            if (existing.order !== cat.order) {
                await Category_1.default.updateOne({ _id: existing._id }, { order: cat.order });
            }
            continue;
        }
        await Category_1.default.create({
            name: cat.name,
            slug: cat.slug,
            parentSlug: null,
            megaDropdownLabel: cat.name,
            order: cat.order,
            isActive: true,
        });
    }
}
//# sourceMappingURL=ensureStoreCategories.js.map