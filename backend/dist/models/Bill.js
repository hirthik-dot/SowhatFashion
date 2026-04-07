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
const ItemSchema = new mongoose_1.Schema({
    product: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Product' },
    barcode: { type: String, trim: true, default: '' },
    name: { type: String, trim: true, default: '' },
    category: { type: String, trim: true, default: '' },
    size: { type: String, trim: true, default: '' },
    mrp: { type: Number, default: 0 },
    itemDiscountType: { type: String, enum: ['percent', 'amount', 'none'], default: 'none' },
    itemDiscountValue: { type: Number, default: 0 },
    itemDiscountAmount: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    quantity: { type: Number, default: 1, min: 1 },
    gstPercent: { type: Number, default: 5 },
    lineTotal: { type: Number, default: 0 },
}, { _id: false });
const BillSchema = new mongoose_1.Schema({
    billNumber: { type: String, unique: true, sparse: true, trim: true },
    customer: {
        name: { type: String, trim: true, default: '' },
        phone: { type: String, trim: true, default: '' },
    },
    salesman: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Salesman' },
    items: [ItemSchema],
    subtotal: { type: Number, required: true, default: 0 },
    totalItemDiscount: { type: Number, default: 0 },
    billDiscountType: { type: String, enum: ['percent', 'amount', 'none'], default: 'none' },
    billDiscountValue: { type: Number, default: 0 },
    billDiscountAmount: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    paymentMethod: { type: String, enum: ['cash', 'gpay', 'upi', 'card', 'partial'], default: 'cash' },
    paymentBreakdown: [
        {
            _id: false,
            method: { type: String, enum: ['cash', 'gpay', 'upi', 'card'], required: true },
            amount: { type: Number, required: true, min: 0 },
        },
    ],
    cashReceived: { type: Number, default: 0 },
    changeReturned: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['draft', 'held', 'completed', 'replaced', 'partial_replaced'],
        default: 'draft',
    },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'BillingAdmin' },
    completedAt: { type: Date },
    editHistory: [
        {
            _id: false,
            editedAt: { type: Date, required: true, default: Date.now },
            editedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'BillingAdmin' },
            editReason: { type: String, required: true, trim: true },
            previousTotal: { type: Number, required: true, default: 0 },
            newTotal: { type: Number, required: true, default: 0 },
        },
    ],
}, { timestamps: true });
exports.default = mongoose_1.default.model('Bill', BillSchema);
//# sourceMappingURL=Bill.js.map