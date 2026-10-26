import http from 'http';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import { ENV } from './config/env.js';
import { startReservationExpiryJob } from './services/reservationExpiryService.js';
import { ensureAdmin } from './utils/ensureAdmin.js';
import { seedStoreCatalog } from './services/storeCatalogSeeder.js';
import { initSocket } from './socket/index.js';
import { startWorker } from './jobs/worker.js';

const startServer = async () => {
  try {
    // Attempt database connection
    try {
      await connectDatabase();
      startReservationExpiryJob();
      if (process.env.WORKER_ENABLED !== 'false') startWorker();
      await ensureAdmin();
      try {
        // Keep the shop's demo catalogue in MongoDB so cart & checkout work (adds missing items only)
        const { created } = await seedStoreCatalog();
        if (created > 0) console.log(`[WinterWear] Added ${created} storefront product(s) to the database.`);
      } catch (seedError) {
        console.warn(`[WinterWear] Storefront catalogue sync skipped: ${seedError.message}`);
      }
    } catch (dbError) {
      console.warn(
        `[WinterWear Server Warning] Database connection could not be established immediately: ${dbError.message}`
      );
      console.warn(`[WinterWear Server Warning] Operating in resilient mode. Endpoints requiring MongoDB will return DB errors until Atlas connects.`);
    }

    const PORT = ENV.PORT || 5000;

    const server = http.createServer(app);
    await initSocket(server);
    server.listen(PORT, () => {
      console.log('====================================================');
      console.log(`[WinterWear Server] Online in ${ENV.NODE_ENV} mode`);
      console.log(`[WinterWear Server] Port: ${PORT}`);
      console.log(`[WinterWear Server] API v1 Base: http://localhost:${PORT}/api/v1`);
      console.log(`[WinterWear Server] API Docs: http://localhost:${PORT}/api/docs`);
      console.log(`[WinterWear Server] Health Check: http://localhost:${PORT}/api/health`);
      console.log('====================================================');
    });

    // Graceful process termination
    const gracefulShutdown = (signal) => {
      console.log(`\n[WinterWear Server] Received ${signal}. Starting graceful shutdown...`);
      server.close(() => {
        console.log('[WinterWear Server] HTTP server terminated.');
        process.exit(0);
      });

      // Force terminate if graceful shutdown hangs
      setTimeout(() => {
        console.error('[WinterWear Server] Forceful shutdown initiated after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[Unhandled Rejection at]:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      console.error('[Uncaught Exception]:', error);
      process.exit(1);
    });
  } catch (error) {
    console.error(`[Fatal Startup Error] ${error.message}`);
    process.exit(1);
  }
};

startServer();

export default app;
