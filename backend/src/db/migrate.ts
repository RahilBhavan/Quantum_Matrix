import pool from '../config/database.js';
import { logger } from '../middleware/logger.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
    try {
        logger.info('🔄 Running database migrations...');

        // Read migration file
        const migrationPath = join(__dirname, './migrations/001_initial_schema.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf-8');

        // Execute migration
        await pool.query(migrationSQL);

        logger.info('✅ Migrations completed successfully!');
        process.exit(0);
    } catch (error) {
        logger.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigrations();
