import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

const createAdmin = async () => {
  try {
    const { MONGO_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    if (!MONGO_URI || !ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
      throw new Error('MONGO_URI, ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env');
    }
    if (ADMIN_PASSWORD.length < 8) {
      throw new Error('Admin password must be at least 8 characters.');
    }

    await mongoose.connect(MONGO_URI);

    const email = ADMIN_EMAIL.trim().toLowerCase();
    let user = await User.findOne({ email }).select('+password');

    if (user) {
      user.name = ADMIN_NAME.trim();
      user.password = ADMIN_PASSWORD; // pre-save hook should hash this
      user.role = 'admin';
      user.isActive = true;
      await user.save();
      console.log(`Admin updated: ${email}`);
    } else {
      user = await User.create({
        name: ADMIN_NAME.trim(),
        email,
        password: ADMIN_PASSWORD,
        role: 'admin',
        isActive: true,
      });
      console.log(`Admin created: ${user.email}`);
    }
  } catch (error) {
    console.error('Admin setup failed:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
};

createAdmin();