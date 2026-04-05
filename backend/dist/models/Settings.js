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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const SettingsSchema = new mongoose_1.Schema({
    activeHomepage: {
        type: String,
        enum: ['allensolly', 'magazine', 'catalogue'],
        default: 'allensolly',
    },
    announcementText: {
        type: String,
        default: 'FREE DELIVERY ABOVE ₹999 | SALE UP TO 50% OFF',
    },
    instagramHandle: { type: String, default: '@sowaatmenswear' },
    freeDeliveryAbove: { type: Number, default: 999 },
    whatsappNumber: { type: String, default: '+919876543210' },
    placeholders: {
        allensolly: {
            heroImage: { type: String, default: '' },
            categoryTshirt: { type: String, default: '' },
            categoryShirt: { type: String, default: '' },
            categoryPant: { type: String, default: '' },
            instagramImages: { type: [String], default: [] },
        },
        magazine: {
            heroImage: { type: String, default: '' },
            curatedStaplesImage: { type: String, default: '' },
        },
        catalogue: {
            carouselImages: { type: [String], default: [] },
        },
    },
    homepageSections: {
        catalogue: [
            {
                id: String,
                label: String,
                isVisible: Boolean,
                order: Number,
                canDelete: Boolean,
            },
        ],
        allensolly: [
            {
                id: String,
                label: String,
                isVisible: Boolean,
                order: Number,
                canDelete: Boolean,
            },
        ],
        magazine: [
            {
                id: String,
                label: String,
                isVisible: Boolean,
                order: Number,
                canDelete: Boolean,
            },
        ],
    },
}, { timestamps: true });
exports.default = mongoose_1.default.model('Settings', SettingsSchema);
//# sourceMappingURL=Settings.js.map