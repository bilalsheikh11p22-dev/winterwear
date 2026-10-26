/**
 * MUST be the first import of every DB-backed test file: it pins the environment BEFORE app/config modules load.
 * Safety: tests only ever talk to a local database whose name contains "_test". The repo's real .env (Atlas)
 * is neutralised because dotenv never overrides variables that are already set.
 */
process.env.NODE_ENV = 'test';
process.env.OUTBOX_INLINE = 'false'; // tests drain the outbox explicitly → deterministic
process.env.RATE_LIMIT_DISABLED = 'true';
process.env.WORKER_ENABLED = 'false';
process.env.JWT_ACCESS_SECRET = 'test_access_secret_not_for_production_0123456789';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_not_for_production_0123456789';
process.env.CLIENT_URL = 'http://localhost:5173';
for (const k of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_PASSWORD', 'REDIS_URL']) delete process.env[k];

const BASE = process.env.TEST_MONGODB_BASE || 'mongodb://127.0.0.1:27017';
export const dbNameFor = (suite) => `winterwear_test_${suite}`;
process.env.MONGODB_URI = `${BASE}/winterwear_test_default?directConnection=true`;

export const TEST_BASE = BASE;
