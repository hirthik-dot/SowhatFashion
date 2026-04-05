"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongoose_1 = __importDefault(require("mongoose"));
const Admin_1 = __importDefault(require("./models/Admin"));
const Settings_1 = __importDefault(require("./models/Settings"));
const Product_1 = __importDefault(require("./models/Product"));
const Offer_1 = __importDefault(require("./models/Offer"));
const NewArrival_1 = __importDefault(require("./models/NewArrival"));
const seedData = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        // Clear existing data
        await Admin_1.default.deleteMany({});
        await Settings_1.default.deleteMany({});
        await Product_1.default.deleteMany({});
        await Offer_1.default.deleteMany({});
        await NewArrival_1.default.deleteMany({});
        console.log('Cleared existing data');
        // 1. Create admin user
        const admin = await Admin_1.default.create({
            email: 'admin@sowaatmenswear.com',
            password: 'admin123',
        });
        console.log('✅ Admin created:', admin.email);
        // 2. Create default settings
        const settings = await Settings_1.default.create({
            activeHomepage: 'allensolly',
            announcementText: 'FREE DELIVERY ABOVE ₹999 | SALE UP TO 50% OFF',
            instagramHandle: '@sowaatmenswear',
            freeDeliveryAbove: 999,
            whatsappNumber: '+919876543210',
        });
        console.log('✅ Settings created, active homepage:', settings.activeHomepage);
        // 3. Create 12 sample products
        const products = await Product_1.default.create([
            // T-Shirts
            {
                name: 'Classic Black Crew Neck',
                category: 'tshirt',
                images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray.jpg'],
                price: 599,
                discountPrice: 449,
                sizes: ['S', 'M', 'L', 'XL', 'XXL'],
                stock: 50,
                tags: ['classic', 'black', 'crew-neck'],
                isFeatured: true,
                isNewArrival: false,
                isActive: true,
            },
            {
                name: 'Premium Polo Navy Blue',
                category: 'tshirt',
                images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray.jpg'],
                price: 799,
                discountPrice: 599,
                sizes: ['S', 'M', 'L', 'XL'],
                stock: 35,
                tags: ['polo', 'navy', 'premium'],
                isFeatured: true,
                isNewArrival: true,
                isActive: true,
            },
            {
                name: 'Striped V-Neck Tee',
                category: 'tshirt',
                images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray.jpg'],
                price: 499,
                discountPrice: 399,
                sizes: ['M', 'L', 'XL'],
                stock: 40,
                tags: ['striped', 'v-neck', 'casual'],
                isFeatured: false,
                isNewArrival: true,
                isActive: true,
            },
            {
                name: 'Oversized Graphic Print Tee',
                category: 'tshirt',
                images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray.jpg'],
                price: 699,
                discountPrice: 499,
                sizes: ['S', 'M', 'L', 'XL', 'XXL'],
                stock: 25,
                tags: ['oversized', 'graphic', 'trendy'],
                isFeatured: false,
                isNewArrival: true,
                isActive: true,
            },
            // Shirts
            {
                name: 'Oxford White Formal Shirt',
                category: 'shirt',
                images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray.jpg'],
                price: 1299,
                discountPrice: 999,
                sizes: ['S', 'M', 'L', 'XL'],
                stock: 30,
                tags: ['formal', 'white', 'oxford'],
                isFeatured: true,
                isNewArrival: false,
                isActive: true,
            },
            {
                name: 'Slim Fit Check Shirt',
                category: 'shirt',
                images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray.jpg'],
                price: 1199,
                discountPrice: 899,
                sizes: ['S', 'M', 'L', 'XL', 'XXL'],
                stock: 45,
                tags: ['slim-fit', 'check', 'casual'],
                isFeatured: true,
                isNewArrival: true,
                isActive: true,
            },
            {
                name: 'Linen Summer Shirt',
                category: 'shirt',
                images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray.jpg'],
                price: 1499,
                discountPrice: 1199,
                sizes: ['M', 'L', 'XL'],
                stock: 20,
                tags: ['linen', 'summer', 'breathable'],
                isFeatured: false,
                isNewArrival: true,
                isActive: true,
            },
            {
                name: 'Denim Casual Shirt',
                category: 'shirt',
                images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray.jpg'],
                price: 1399,
                discountPrice: 0,
                sizes: ['S', 'M', 'L', 'XL'],
                stock: 28,
                tags: ['denim', 'casual', 'rugged'],
                isFeatured: false,
                isNewArrival: false,
                isActive: true,
            },
            // Pants
            {
                name: 'Classic Khaki Chinos',
                category: 'pant',
                images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray.jpg'],
                price: 999,
                discountPrice: 799,
                sizes: ['S', 'M', 'L', 'XL', 'XXL'],
                stock: 60,
                tags: ['chinos', 'khaki', 'classic'],
                isFeatured: true,
                isNewArrival: false,
                isActive: true,
            },
            {
                name: 'Slim Fit Black Trousers',
                category: 'pant',
                images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray.jpg'],
                price: 1199,
                discountPrice: 899,
                sizes: ['S', 'M', 'L', 'XL'],
                stock: 35,
                tags: ['slim-fit', 'black', 'formal'],
                isFeatured: true,
                isNewArrival: true,
                isActive: true,
            },
            {
                name: 'Relaxed Fit Joggers',
                category: 'pant',
                images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray.jpg'],
                price: 899,
                discountPrice: 699,
                sizes: ['M', 'L', 'XL', 'XXL'],
                stock: 42,
                tags: ['joggers', 'relaxed', 'casual'],
                isFeatured: false,
                isNewArrival: true,
                isActive: true,
            },
            {
                name: 'Cargo Pants Olive Green',
                category: 'pant',
                images: ['https://res.cloudinary.com/demo/image/upload/v1/samples/ecommerce/leather-bag-gray.jpg'],
                price: 1099,
                discountPrice: 849,
                sizes: ['S', 'M', 'L', 'XL'],
                stock: 22,
                tags: ['cargo', 'olive', 'utility'],
                isFeatured: false,
                isNewArrival: false,
                isActive: true,
            },
        ]);
        console.log(`✅ ${products.length} products created`);
        // 4. Create 2 sample offers
        const now = new Date();
        const flashEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
        const comboEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        const offers = await Offer_1.default.create([
            {
                title: 'Weekend Flash Sale - Up to 40% Off',
                subtitle: 'Up to 40% off on tees and shirts',
                description: 'Grab premium t-shirts and shirts at unbeatable prices this weekend!',
                type: 'flash',
                carouselTemplate: 'fullbleed',
                image: products[0].images?.[0] || '',
                discountPercent: 40,
                ctaText: 'SHOP THE SALE',
                comboDetails: '',
                products: [products[0]._id, products[1]._id, products[4]._id, products[5]._id],
                startTime: now,
                endTime: flashEnd,
                isActive: true,
                showOnHomepage: true,
                showOnCarousel: true,
                hasCountdown: true,
                order: 0,
            },
            {
                title: 'Buy 2 Get 1 Free - Mix & Match',
                subtitle: 'Fresh styles every week',
                description: 'Pick any 3 items and get the lowest priced one absolutely free!',
                type: 'combo',
                carouselTemplate: 'splitcard',
                image: products[2].images?.[0] || '',
                discountPercent: 33,
                discountLabel: 'BUY 2 GET 1',
                ctaText: 'EXPLORE NOW',
                comboDetails: 'Buy any 2 products from the collection and get the 3rd one free. Applicable on all categories.',
                products: [products[0]._id, products[2]._id, products[8]._id, products[10]._id],
                startTime: now,
                endTime: comboEnd,
                isActive: true,
                showOnHomepage: true,
                showOnCarousel: true,
                hasCountdown: true,
                order: 1,
            },
        ]);
        console.log(`✅ ${offers.length} offers created`);
        await NewArrival_1.default.create([
            { product: products[0]._id, weekLabel: 'This Week', order: 0 },
            { product: products[1]._id, weekLabel: 'This Week', order: 1 },
        ]);
        console.log('✅ New arrivals created');
        console.log('\n🎉 Seed completed successfully!');
        console.log('Admin login: admin@sowaatmenswear.com / admin123');
        process.exit(0);
    }
    catch (error) {
        console.error('Seed failed:', error);
        process.exit(1);
    }
};
seedData();
//# sourceMappingURL=seed.js.map