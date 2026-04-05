"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        const conn = await mongoose_1.default.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        // Create indexes
        const db = conn.connection.db;
        if (db) {
            // Product indexes
            await db.collection('products').createIndex({ slug: 1 }, { unique: true });
            await db.collection('products').createIndex({ category: 1 });
            await db.collection('products').createIndex({ isActive: 1, isFeatured: 1 });
            await db.collection('products').createIndex({ isActive: 1, isNewArrival: 1 });
            // Offer indexes
            await db.collection('offers').createIndex({ isActive: 1, endTime: 1 });
            // Order indexes
            await db.collection('orders').createIndex({ createdAt: -1 });
        }
    }
    catch (error) {
        console.error('Database connection error:', error);
        throw error;
    }
};
exports.default = connectDB;
//# sourceMappingURL=db.js.map