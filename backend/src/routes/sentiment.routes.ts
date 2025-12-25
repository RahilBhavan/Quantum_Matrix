import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { geminiService } from '../services/gemini.service.js';
import { s3SentimentService } from '../services/s3-sentiment.service.js';
import { macroEconomicService } from '../services/macro-economic.service.js';
import { SentimentQueries } from '../db/queries/sentiment.js';
import { cacheService } from '../services/cache.service.js';
import { CacheKeys, CacheTTL } from '../utils/cache.js';

const router = Router();

/**
 * GET /api/sentiment/current
 * Get current market sentiment using real-time data sources
 *
 * @deprecated Use /api/sentiment/s3 for multi-model sentiment analysis
 */
router.get(
    '/current',
    aiLimiter,
    asyncHandler(async (_req: Request, res: Response) => {
        const cacheKey = CacheKeys.sentiment();

        // Add deprecation headers
        res.set('X-Deprecated', 'true');
        res.set('X-Deprecation-Notice', 'Use /api/sentiment/s3 instead');

        // Try cache first
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            const ttl = await cacheService.ttl(cacheKey);
            return res.json({
                success: true,
                data: {
                    ...(cached as any),
                    cachedAt: new Date(Date.now() - (CacheTTL.sentiment - ttl) * 1000).toISOString(),
                    expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
                },
                cached: true,
                deprecated: true,
                deprecationNotice: 'This endpoint is deprecated. Please use /api/sentiment/s3 for multi-model sentiment analysis.',
            });
        }

        // Get real-time sentiment from live data sources
        // (CoinGecko, Fear & Greed Index, Reddit r/cryptocurrency)
        const sentiment = await geminiService.analyzeRealTimeSentiment();

        // Save to database for historical tracking
        await SentimentQueries.create(sentiment);

        return res.json({
            success: true,
            data: {
                ...sentiment,
                cachedAt: new Date().toISOString(),
                expiresAt: new Date(Date.now() + CacheTTL.sentiment * 1000).toISOString(),
            },
            deprecated: true,
            deprecationNotice: 'This endpoint is deprecated. Please use /api/sentiment/s3 for multi-model sentiment analysis.',
        });
    })
);

/**
 * GET /api/sentiment/history
 * Get historical sentiment data
 */
router.get(
    '/history',
    asyncHandler(async (req: Request, res: Response) => {
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

        return res.json({
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
    asyncHandler(async (req: Request, res: Response) => {
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

        return res.json({
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
    asyncHandler(async (req: Request, res: Response) => {
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

        return res.json({
            success: true,
            data: s3Result,
        });
    })
);

/**
 * GET /api/sentiment/macro
 * Get macro-economic indicators and their signals for crypto markets
 * 
 * Returns:
 * - CPI (Consumer Price Index) - Inflation data
 * - Federal Funds Rate - Interest rate policy
 * - DXY (US Dollar Index) - Dollar strength
 * - Composite score indicating overall macro environment for crypto
 */
router.get(
    '/macro',
    asyncHandler(async (_req: Request, res: Response) => {
        const macroSignals = await macroEconomicService.getMacroSignals();

        return res.json({
            success: true,
            data: {
                cpi: macroSignals.cpi ? {
                    value: macroSignals.cpi.value,
                    yoyChange: macroSignals.cpi.yoyChange,
                    isAboveTarget: macroSignals.cpi.isAboveTarget,
                    trend: macroSignals.cpi.trend,
                    signal: macroSignals.signals.cpiSignal,
                    lastUpdate: macroSignals.cpi.lastUpdate,
                } : null,
                federalFundsRate: macroSignals.federalFundsRate ? {
                    value: macroSignals.federalFundsRate.effectiveRate,
                    targetRange: `${macroSignals.federalFundsRate.targetRangeLow}% - ${macroSignals.federalFundsRate.targetRangeHigh}%`,
                    stance: macroSignals.federalFundsRate.fedStance,
                    trend: macroSignals.federalFundsRate.trend,
                    signal: macroSignals.signals.rateSignal,
                    lastUpdate: macroSignals.federalFundsRate.lastUpdate,
                } : null,
                dxy: macroSignals.dxy ? {
                    value: macroSignals.dxy.value,
                    strength: macroSignals.dxy.strength,
                    trend: macroSignals.dxy.trend,
                    signal: macroSignals.signals.dxySignal,
                    lastUpdate: macroSignals.dxy.lastUpdate,
                } : null,
                compositeScore: macroSignals.compositeScore,
                interpretation: macroSignals.interpretation,
                dataFreshness: macroSignals.dataFreshness,
                lastUpdate: macroSignals.lastUpdate,
                // Crypto market interpretation
                cryptoOutlook: macroSignals.compositeScore > 0.2
                    ? 'Supportive - Low rates/inflation favor risk assets like crypto'
                    : macroSignals.compositeScore < -0.2
                        ? 'Challenging - High rates/inflation create headwinds for crypto'
                        : 'Neutral - Mixed macro signals',
            },
        });
    })
);

export default router;

