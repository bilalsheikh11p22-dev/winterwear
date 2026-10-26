// Standalone worker entry:  npm run worker
// Use this when you run several API instances and want exactly one place doing background work
// (set WORKER_ENABLED=false on the API processes in that case).
import { connectDatabase } from './config/database.js';
import { startWorker } from './jobs/worker.js';

await connectDatabase();
startWorker();
