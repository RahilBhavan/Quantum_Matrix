import pool from '../config/database.js';
import { logger } from '../middleware/logger.js';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigrations() {
    try {
        logger.info('🔄 Running database migrations...');

        const migrationsDir = join(__dirname, './migrations');
        const files = readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Ensure 001 runs before 002

        for (const file of files) {
            logger.info(`Running migration: ${file}`);
            const migrationPath = join(migrationsDir, file);
            const migrationSQL = readFileSync(migrationPath, 'utf-8');
            await pool.query(migrationSQL);
        }

        logger.info('✅ All migrations completed successfully!');
        process.exit(0);
    } catch (error) {
        logger.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigrations();
