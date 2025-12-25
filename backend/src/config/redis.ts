import Redis from 'ioredis';
import { config } from './env.js';

// Create Redis client
export const redis = new Redis({
    host: new URL(config.redis.url).hostname,
    port: parseInt(new URL(config.redis.url).port || '6379'),
    password: config.redis.password,
    db: config.redis.db,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
    console.log('✅ Redis connected');
});

redis.on('error', (err) => {
    console.error('❌ Redis error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Closing Redis connection...');
    await redis.quit();
});

export default redis;
