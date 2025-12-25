import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { geminiService } from '../services/gemini.service.js';
import { SentimentQueries } from '../db/queries/sentiment.js';
import { cacheService } from '../services/cache.service.js';
import { CacheKeys, CacheTTL } from '../utils/cache.js';

const router = Router();

/**
 * GET /api/sentiment/current
 * Get current market sentiment using real-time data sources
 */
router.get(
    '/current',
    aiLimiter,
    asyncHandler(async (req, res) => {
        const cacheKey = CacheKeys.sentiment();

        // Try cache first
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            const ttl = await cacheService.ttl(cacheKey);
            return res.json({
                success: true,
                data: {
                    ...cached,
                    cachedAt: new Date(Date.now() - (CacheTTL.sentiment - ttl) * 1000).toISOString(),
                    expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
                },
                cached: true,
            });
        }

        // Get real-time sentiment from live data sources
        // (CoinGecko, Fear & Greed Index, Reddit r/cryptocurrency)
        const sentiment = await geminiService.analyzeRealTimeSentiment();

        // Save to database for historical tracking
        await SentimentQueries.create(sentiment);

        res.json({
            success: true,
            data: {
                ...sentiment,
                cachedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + CacheTTL.sentiment * 1000).toISOString(),
            },
        });
    })
);

/**
 * GET /api/sentiment/history
 * Get historical sentiment data
 */
router.get(
    '/history',
    asyncHandler(async (req, res) => {
        const days = parseInt(req.query.days as string) || 7;

        // Try cache first
        const cacheKey = CacheKeys.sentimentHistory(days);
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            return res.json({
                success: true,
                data: cached,
                cached: true,
            });
        }

        // Get from database
        const history = await SentimentQueries.getHistory(days);

        // Cache result
        await cacheService.set(cacheKey, { history }, CacheTTL.sentimentHistory);

        res.json({
            success: true,
            data: { history },
        });
    })
);

/**
 * POST /api/sentiment/recommendation
 * Get AI portfolio recommendation
 */
router.post(
    '/recommendation',
    aiLimiter,
    asyncHandler(async (req, res) => {
        const { sentiment, ecosystem, assets, strategies } = req.body;

        if (!sentiment || !ecosystem || !assets || !strategies) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
            });
        }

        const recommendation = await geminiService.getPortfolioRecommendation(
            sentiment,
            ecosystem,
            assets,
            strategies
        );

        res.json({
            success: true,
            data: recommendation,
        });
    })
);

export default router;
