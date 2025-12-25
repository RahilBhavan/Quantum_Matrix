import pg from 'pg';
import { config } from './env.js';

const { Pool } = pg;

// SSL configuration for production
const sslConfig = config.server.isProduction
    ? { rejectUnauthorized: false }
    : undefined;

// Create PostgreSQL connection pool
export const pool = new Pool({
    connectionString: config.database.url,
    ssl: sslConfig,
    min: config.database.pool.min,
    max: config.database.pool.max,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
    console.log('✅ PostgreSQL connected');
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL error:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Closing PostgreSQL pool...');
    await pool.end();
});

export default pool;
