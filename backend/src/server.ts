import app from './app.js';
import { config } from './config/env.js';
import { logger } from './middleware/logger.js';
import pool from './config/database.js';
import redis from './config/redis.js';

const PORT = config.server.port;

// Test database connection
async function testConnections() {
    try {
        // Test PostgreSQL
        await pool.query('SELECT NOW()');
        logger.info('✅ PostgreSQL connection successful');

        // Test Redis
        await redis.ping();
        logger.info('✅ Redis connection successful');
    } catch (error) {
        logger.error('❌ Connection test failed:', error);
        process.exit(1);
    }
}

// Start server
async function startServer() {
    try {
        await testConnections();

        app.listen(PORT, () => {
            logger.info(`🚀 Server running on port ${PORT}`);
            logger.info(`📍 Environment: ${config.server.env}`);
            logger.info(`🌐 API Base URL: ${config.server.baseUrl}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...');
    await pool.end();
    await redis.quit();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...');
    await pool.end();
    await redis.quit();
    process.exit(0);
});

startServer();
