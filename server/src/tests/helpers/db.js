import './testEnv.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { TEST_BASE, dbNameFor } from './testEnv.js';

export const connectTestDb = async (suite) => {
  const name = dbNameFor(suite);
  if (!/_test_/.test(name) || !/^mongodb:\/\/(127\.0\.0\.1|localhost)/.test(TEST_BASE)) {
    throw new Error(`Refusing to run tests against "${TEST_BASE}/${name}"`);
  }
  await mongoose.connect(`${TEST_BASE}/${name}?directConnection=true`, { serverSelectionTimeoutMS: 5000 });
  await mongoose.connection.dropDatabase();
  // Build all indexes (unique/partial/TTL) exactly as production does via `npm run db:indexes`
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  return mongoose.connection;
};

export const resetDb = async () => {
  const cols = await mongoose.connection.db.collections();
  await Promise.all(cols.map((c) => c.deleteMany({})));
};

export const closeTestDb = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};

export const tokenFor = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });

export const authHeader = (user) => ({ Authorization: `Bearer ${tokenFor(user)}` });
