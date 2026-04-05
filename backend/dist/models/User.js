"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const addressSchema = new mongoose_1.default.Schema({
    label: { type: String, default: 'Home' },
    line1: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    isDefault: { type: Boolean, default: false }
});
const userSchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    avatar: { type: String },
    googleId: { type: String },
    isEmailVerified: { type: Boolean, default: false },
    savedAddresses: [addressSchema],
    wishlist: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: 'Product' }],
    lastLoginAt: { type: Date }
}, { timestamps: true });
exports.User = mongoose_1.default.model('User', userSchema);
//# sourceMappingURL=User.js.map