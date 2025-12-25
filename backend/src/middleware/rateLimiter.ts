import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

// General API endpoints: 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
        res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            message: 'Too many requests from this IP, please try again later.',
            retryAfter: res.getHeader('Retry-After'),
        });
    },
});

// Gemini AI endpoints: 10 requests per minute per IP
export const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: config.rateLimit.aiMaxRequests,
    message: {
        success: false,
        error: 'AI request limit exceeded. Please wait before making more requests.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    handler: (_req, res) => {
        res.status(429).json({
            success: false,
            error: 'AI rate limit exceeded',
            message: 'AI request limit exceeded. Please wait before making more requests.',
            retryAfter: res.getHeader('Retry-After'),
        });
    },
});

// Write operations: 20 requests per minute per user
export const writeLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20,
    keyGenerator: (req) => {
        // Use wallet address from body or IP as fallback
        return (req.body?.walletAddress as string) || req.ip || 'unknown';
    },
    message: {
        success: false,
        error: 'Write operation limit exceeded. Please wait before making more changes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
