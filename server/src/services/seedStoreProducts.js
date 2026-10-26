import 'dotenv/config';
import mongoose from 'mongoose';
import { seedStoreCatalog } from '../src/services/storeCatalogSeeder.js';

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/winterwear');
    const { created, present } = await seedStoreCatalog();
    console.log(`Storefront products ready. Created: ${created}, already present: ${present}.`);
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
