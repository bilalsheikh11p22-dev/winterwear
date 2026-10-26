import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

dotenv.config();

const SEED_CATEGORIES = [
  {
    name: 'Winter Jackets',
    slug: 'winter-jackets',
    description: 'Technical shells, alpine parkas, and weather-proof winter shields [TEST SEED DATA]',
    collectionType: 'Unisex',
  },
  {
    name: 'Puffer Jackets',
    slug: 'puffer-jackets',
    description: '850+ fill power European goose down puffers [TEST SEED DATA]',
    collectionType: 'Unisex',
  },
  {
    name: 'Wool Coats',
    slug: 'wool-coats',
    description: 'Virgin wool and cashmere double-breasted overcoats [TEST SEED DATA]',
    collectionType: 'Women',
  },
  {
    name: 'Leather & Shearling',
    slug: 'leather-jackets',
    description: 'Spanish sheepskin shearling aviator jackets [TEST SEED DATA]',
    collectionType: 'Men',
  },
];

export const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/winterwear';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB for staging test fixtures...');

    // Clear existing development collections
    await Category.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({});

    console.log('[Seed] Cleaned existing development collections.');

    // Seed Categories
    const createdCategories = await Category.insertMany(SEED_CATEGORIES);
    console.log(`[Seed] Seeded ${createdCategories.length} categories.`);

    // Seed Staff & Test Users
    const adminUser = await User.create({
      name: 'Super Admin [TEST USER]',
      email: 'admin@winterwear.local',
      password: 'AdminPassword123!',
      role: 'super_admin',
      isEmailVerified: true,
    });

    const inventoryManager = await User.create({
      name: 'Warehouse Manager [TEST USER]',
      email: 'warehouse@winterwear.local',
      password: 'WarehousePassword123!',
      role: 'inventory_manager',
      isEmailVerified: true,
    });

    const riderUser = await User.create({
      name: 'Tariq Rider [TEST USER]',
      email: 'rider@winterwear.local',
      password: 'RiderPassword123!',
      role: 'rider',
      phone: '+92 300 1234567',
      isEmailVerified: true,
    });

    const customerUser = await User.create({
      name: 'Camille Moreau [TEST USER]',
      email: 'shopper@winterwear.local',
      password: 'ShopperPassword123!',
      role: 'customer',
      isEmailVerified: true,
    });

    console.log(`[Seed] Seeded staff roles: SuperAdmin, Warehouse Manager, Rider, Customer.`);
    console.log('[Seed] Database seeding completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
};

if (process.argv[1].endsWith('seedData.js')) {
  seedDatabase();
}
