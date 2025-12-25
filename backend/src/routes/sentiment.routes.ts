import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { geminiService } from '../services/gemini.service.js';
import { s3SentimentService } from '../services/s3-sentiment.service.js';
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

/**
 * GET /api/sentiment/s3
 * Get the S³ (Sentiment Synthesis Score) - advanced multi-model analysis
 */
router.get(
    '/s3',
    aiLimiter,
    asyncHandler(async (req: any, res: any) => {
        // Optional context parameters
        const context = {
            dataSource: req.query.dataSource as 'social_media' | 'news' | 'mixed' | undefined,
            timeHorizon: req.query.timeHorizon as 'short' | 'medium' | 'long' | undefined,
            assetMaturity: req.query.assetMaturity as 'new' | 'established' | undefined,
            volatilityRegime: req.query.volatilityRegime as 'low' | 'normal' | 'high' | undefined,
        };

        const s3Result = await s3SentimentService.calculateS3Score(context);

        // Also save to database for historical tracking
        await SentimentQueries.create({
            score: s3Result.normalizedScore,
            label: s3Result.label,
            summary: s3Result.summary,
            trendingTopics: s3Result.trendingTopics,
            confidence: s3Result.confidence,
        });

        res.json({
            success: true,
            data: s3Result,
        });
    })
);

export default router;
