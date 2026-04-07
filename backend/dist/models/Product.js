"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const slugify_1 = __importDefault(require("slugify"));
const ProductSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    billingName: { type: String, trim: true, default: '' },
    slug: { type: String, unique: true },
    category: {
        type: String,
        required: true,
    },
    subCategory: { type: String, default: '' },
    images: [{ type: String }],
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, default: 0, min: 0 },
    sizes: [{ type: String, trim: true }],
    stock: { type: Number, required: true, default: 0, min: 0 },
    tags: [{ type: String }],
    isFeatured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    barcode: { type: String, unique: true, sparse: true, trim: true },
    sku: { type: String, trim: true, default: '' },
    incomingPrice: { type: Number, min: 0, default: 0 },
    supplier: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Supplier' },
    billingCategory: { type: mongoose_1.Schema.Types.ObjectId, ref: 'BillingCategory' },
    billingSubCategory: { type: mongoose_1.Schema.Types.ObjectId, ref: 'BillingCategory' },
    sizeStock: [
        {
            size: { type: String, required: true, trim: true },
            stock: { type: Number, required: true, min: 0, default: 0 },
        },
    ],
    totalStock: { type: Number, min: 0, default: 0 },
    isBillingProduct: { type: Boolean, default: false, index: true },
}, { timestamps: true });
ProductSchema.pre('save', function (next) {
    if (!this.slug || (this.isModified('name') && !this.isModified('slug'))) {
        this.slug = (0, slugify_1.default)(this.name, { lower: true, strict: true });
    }
    next();
});
exports.default = mongoose_1.default.model('Product', ProductSchema);
//# sourceMappingURL=Product.js.map