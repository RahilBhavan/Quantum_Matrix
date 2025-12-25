import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

// Environment variable schema
const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('3001'),
    API_BASE_URL: z.string().url().default('http://localhost:3001'),

    // Database
    DATABASE_URL: z.string().url(),
    DATABASE_POOL_MIN: z.string().transform(Number).default('2'),
    DATABASE_POOL_MAX: z.string().transform(Number).default('10'),

    // Redis
    REDIS_URL: z.string().default('redis://localhost:6379'),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_DB: z.string().transform(Number).default('0'),

    // Gemini
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().default('gemini-3-flash-preview'),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
    RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
    AI_RATE_LIMIT_MAX: z.string().transform(Number).default('10'),

    // Security
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
    API_KEY_HEADER: z.string().default('X-API-Key'),
    API_SECRET_KEY: z.string(),

    // Logging
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    LOG_FILE: z.string().default('./logs/app.log'),
});

// Parse and validate environment variables
const parseEnv = () => {
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        console.error('❌ Invalid environment variables:', error);
        process.exit(1);
    }
};

export const env = parseEnv();

// Export typed config object
export const config = {
    server: {
        env: env.NODE_ENV,
        port: env.PORT,
        baseUrl: env.API_BASE_URL,
        isDevelopment: env.NODE_ENV === 'development',
        isProduction: env.NODE_ENV === 'production',
    },
    database: {
        url: env.DATABASE_URL,
        pool: {
            min: env.DATABASE_POOL_MIN,
            max: env.DATABASE_POOL_MAX,
        },
    },
    redis: {
        url: env.REDIS_URL,
        password: env.REDIS_PASSWORD,
        db: env.REDIS_DB,
    },
    gemini: {
        apiKey: env.GEMINI_API_KEY,
        model: env.GEMINI_MODEL,
    },
    rateLimit: {
        windowMs: env.RATE_LIMIT_WINDOW_MS,
        maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
        aiMaxRequests: env.AI_RATE_LIMIT_MAX,
    },
    security: {
        corsOrigin: env.CORS_ORIGIN,
        apiKeyHeader: env.API_KEY_HEADER,
        apiSecretKey: env.API_SECRET_KEY,
    },
    logging: {
        level: env.LOG_LEVEL,
        file: env.LOG_FILE,
    },
} as const;
