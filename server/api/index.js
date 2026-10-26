// Vercel serverless entry for the WinterWear API.
// Every request is rewritten here (see server/vercel.json). The Express app is created once per warm
// instance; MongoDB is connected once and reused between invocations.
import app from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import { ensureAdmin } from '../src/utils/ensureAdmin.js';
import { seedStoreCatalog } from '../src/services/storeCatalogSeeder.js';

let booting = null;

const bootstrap = () => {
  if (!booting) {
    booting = (async () => {
      await connectDatabase();
      try { await ensureAdmin(); } catch (e) { console.warn('[Admin] sync skipped:', e.message); }
      try { await seedStoreCatalog(); } catch (e) { console.warn('[Seed] catalogue sync skipped:', e.message); }
    })().catch((err) => {
      booting = null; // retry on the next request instead of caching a failure
      throw err;
    });
  }
  return booting;
};

export default async function handler(req, res) {
  try {
    await bootstrap();
  } catch (err) {
    console.error('[WinterWear] Database unavailable:', err.message);
    // /api/health must still answer so you can tell the function itself is alive.
    if (!String(req.url).startsWith('/api/health')) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: false, message: 'Database is not reachable. Check MONGODB_URI and Atlas network access.' }));
    }
  }
  return app(req, res);
}
