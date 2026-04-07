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
const ReturnItemSchema = new mongoose_1.Schema({
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' },
    barcode: { type: String, trim: true, default: '' },
    name: { type: String, trim: true, default: '' },
    size: { type: String, trim: true, default: '' },
    quantity: { type: Number, default: 1 },
    sellingPrice: { type: Number, default: 0 },
    reason: { type: String, trim: true, default: '' },
}, { _id: false });
const ReplacementItemSchema = new mongoose_1.Schema({
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' },
    barcode: { type: String, trim: true, default: '' },
    name: { type: String, trim: true, default: '' },
    size: { type: String, trim: true, default: '' },
    quantity: { type: Number, default: 1 },
    sellingPrice: { type: Number, default: 0 },
}, { _id: false });
const ReturnSchema = new mongoose_1.Schema({
    bill: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Bill' },
    billNumber: { type: String, trim: true, default: '' },
    returnNumber: { type: String, unique: true, trim: true },
    customer: {
        name: { type: String, trim: true, default: '' },
        phone: { type: String, trim: true, default: '' },
    },
    returnedItems: [ReturnItemSchema],
    replacementItems: [ReplacementItemSchema],
    returnType: { type: String, enum: ['replacement', 'partial'], required: true },
    priceDifference: { type: Number, default: 0 },
    refundAmount: { type: Number, default: 0 },
    refundMethod: { type: String, enum: ['none'], default: 'none' },
    processedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'BillingAdmin' },
}, { timestamps: true });
exports.default = mongoose_1.default.model('Return', ReturnSchema);
//# sourceMappingURL=Return.js.map