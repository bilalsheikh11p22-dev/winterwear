import mongoose from 'mongoose';
import { ENV } from './env.js';

let isConnected = false;

export const connectDatabase = async () => {
  if (isConnected) {
    return mongoose.connection;
  }

  try {
    const sanitizedUri = ENV.MONGODB_URI.replace(
      /\/\/(.*):(.*)@/,
      '//***:***@'
    );
    console.log(`[Database] Connecting to MongoDB Atlas endpoint: ${sanitizedUri}`);

    const connection = await mongoose.connect(ENV.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      autoIndex: ENV.NODE_ENV !== 'production',
      maxPoolSize: 20,
    });

    isConnected = true;
    console.log(
      `[Database Connected] Host: ${connection.connection.host} | Database: ${connection.connection.name}`
    );

    // Setup graceful termination handlers
    process.on('SIGINT', async () => {
      await closeDatabaseConnection('Application termination (SIGINT)');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await closeDatabaseConnection('Container shutdown (SIGTERM)');
      process.exit(0);
    });

    return connection;
  } catch (error) {
    console.error(`[Database Connection Failure] ${error.message}`);
    // In production or test, propagate error for health reporting
    throw error;
  }
};

export const closeDatabaseConnection = async (reason = 'Manual disconnect') => {
  if (!isConnected) return;
  try {
    await mongoose.connection.close(false);
    isConnected = false;
    console.log(`[Database Disconnected] Reason: ${reason}`);
  } catch (err) {
    console.error(`[Database Disconnect Error] ${err.message}`);
  }
};

export default connectDatabase;
