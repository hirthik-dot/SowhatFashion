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
async function ensureUniqueSlug(title, excludeId) {
    let base = (0, slugify_1.default)(title || 'offer', { lower: true, strict: true }) || 'offer';
    let slug = base;
    let n = 1;
    const Model = mongoose_1.default.model('Offer');
    while (true) {
        const q = { slug };
        if (excludeId)
            q._id = { $ne: excludeId };
        const exists = await Model.findOne(q);
        if (!exists)
            return slug;
        slug = `${base}-${n++}`;
    }
}
const OfferSchema = new mongoose_1.Schema({
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, sparse: true, trim: true },
    subtitle: { type: String, default: '' },
    description: { type: String, default: '' },
    type: {
        type: String,
        enum: ['flash', 'combo', 'seasonal'],
        default: 'flash',
    },
    carouselTemplate: {
        type: String,
        enum: ['fullbleed', 'splitcard', 'spotlight'],
        default: 'fullbleed',
    },
    image: { type: String, default: '' },
    backgroundImage: { type: String, default: '' },
    accentColor: { type: String, default: '' },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountLabel: { type: String, default: '' },
    comboDetails: { type: String, default: '' },
    ctaText: { type: String, default: 'SHOP NOW' },
    products: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' }],
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },
    hasCountdown: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    showOnCarousel: { type: Boolean, default: false },
    showOnHomepage: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
}, { timestamps: true });
OfferSchema.pre('save', async function (next) {
    if (this.isModified('title') || !this.slug) {
        try {
            this.slug = await ensureUniqueSlug(this.title, this._id);
        }
        catch (e) {
            return next(e);
        }
    }
    next();
});
exports.default = mongoose_1.default.model('Offer', OfferSchema);
//# sourceMappingURL=Offer.js.map