import redis from '../config/redis.js';
import { logger } from '../middleware/logger.js';

export class CacheService {
    /**
     * Get value from cache
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const value = await redis.get(key);
            if (!value) return null;

            return JSON.parse(value) as T;
        } catch (error) {
            logger.error('Cache get error:', { key, error });
            return null;
        }
    }

    /**
     * Set value in cache with TTL
     */
    async set(key: string, value: any, ttl: number): Promise<boolean> {
        try {
            const serialized = JSON.stringify(value);
            await redis.setex(key, ttl, serialized);
            return true;
        } catch (error) {
            logger.error('Cache set error:', { key, error });
            return false;
        }
    }

    /**
     * Delete key from cache
     */
    async delete(key: string): Promise<boolean> {
        try {
            await redis.del(key);
            return true;
        } catch (error) {
            logger.error('Cache delete error:', { key, error });
            return false;
        }
    }

    /**
     * Delete multiple keys matching pattern
     */
    async deletePattern(pattern: string): Promise<number> {
        try {
            const keys = await redis.keys(pattern);
            if (keys.length === 0) return 0;

            await redis.del(...keys);
            return keys.length;
        } catch (error) {
            logger.error('Cache delete pattern error:', { pattern, error });
            return 0;
        }
    }

    /**
     * Check if key exists
     */
    async exists(key: string): Promise<boolean> {
        try {
            const result = await redis.exists(key);
            return result === 1;
        } catch (error) {
            logger.error('Cache exists error:', { key, error });
            return false;
        }
    }

    /**
     * Get remaining TTL for a key
     */
    async ttl(key: string): Promise<number> {
        try {
            return await redis.ttl(key);
        } catch (error) {
            logger.error('Cache TTL error:', { key, error });
            return -1;
        }
    }

    /**
     * Increment a counter
     */
    async increment(key: string, amount: number = 1): Promise<number> {
        try {
            return await redis.incrby(key, amount);
        } catch (error) {
            logger.error('Cache increment error:', { key, error });
            return 0;
        }
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<any> {
        try {
            const info = await redis.info('stats');
            return info;
        } catch (error) {
            logger.error('Cache stats error:', error);
            return null;
        }
    }
}

export const cacheService = new CacheService();
