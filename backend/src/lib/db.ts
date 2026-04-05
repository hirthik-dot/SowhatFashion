import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string);
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
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

export default connectDB;
