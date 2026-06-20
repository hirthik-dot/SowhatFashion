"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const db_1 = __importDefault(require("./lib/db"));
const ensureStoreCategories_1 = require("./lib/ensureStoreCategories");
const Category_1 = __importDefault(require("./models/Category"));
async function syncCategories() {
    await (0, db_1.default)();
    await (0, ensureStoreCategories_1.ensureStoreCategories)();
    const topLevel = await Category_1.default.find({ parentSlug: null }).sort({ order: 1 });
    console.log(`✅ Synced ${topLevel.length} top-level categories:`);
    topLevel.forEach((c) => console.log(`   - ${c.name} (${c.slug})`));
    process.exit(0);
}
syncCategories().catch((err) => {
    console.error('Sync failed:', err);
    process.exit(1);
});
//# sourceMappingURL=syncCategories.js.map