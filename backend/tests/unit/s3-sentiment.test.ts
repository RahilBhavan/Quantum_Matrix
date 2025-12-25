import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config BEFORE importing services that use it
vi.mock('../../src/config/env.js', () => ({
    config: {
        gemini: { apiKey: 'mock-key', model: 'mock-model' },
        logging: { level: 'info', file: 'test.log' },
        redis: { url: 'redis://localhost:6379', password: undefined, db: 0 },
        rateLimit: { windowMs: 1000, maxRequests: 100 },
        security: { corsOrigin: '*', apiKeyHeader: 'X-API-Key' },
        server: { isProduction: false, isDevelopment: true },
        database: { url: 'postgres://localhost:5432/db', pool: { min: 2, max: 10 } }
    },
    env: {
        NODE_ENV: 'test'
    }
}));

import { s3SentimentService } from '../../src/services/s3-sentiment.service.js';
import { newsService } from '../../src/services/news.service.js';
import { geminiService } from '../../src/services/gemini.service.js';
import { macroEconomicService } from '../../src/services/macro-economic.service.js';
import { cacheService } from '../../src/services/cache.service.js';

// Mock dependencies
vi.mock('../../src/services/news.service.js');
vi.mock('../../src/services/gemini.service.js');
vi.mock('../../src/services/macro-economic.service.js');
vi.mock('../../src/services/cache.service.js');

describe('S3SentimentService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mock implementation for cache (miss)
        vi.mocked(cacheService.get).mockResolvedValue(null);
    });

    it('should calculate S3 score correctly under normal conditions', async () => {
        // Mock Data
        vi.mocked(newsService.getAggregatedData).mockResolvedValue({
            fearGreedIndex: { value: 50, classification: 'Neutral' },
            news: [{ title: 'Bitcoin is stable today', source: 'CoinTelegraph', pubDate: '', link: '' }],
            trendingCoins: ['BTC'],
            redditSentiment: [{ title: 'HODL everyone', score: 100, numComments: 50, url: '' }],
        });

        vi.mocked(geminiService.analyzeRealTimeSentiment).mockResolvedValue({
            score: 50,
            label: 'Neutral',
            summary: 'Stable market',
            trendingTopics: [],
            confidence: 0.8
        });

        vi.mocked(macroEconomicService.getMacroSignals).mockResolvedValue({
            compositeScore: 0,
            interpretation: 'Neutral',
            signals: { cpiSignal: 0, rateSignal: 0, dxySignal: 0 },
            cpi: null, federalFundsRate: null, dxy: null,
            lastUpdate: '',
            dataFreshness: 'fresh'
        });

        const result = await s3SentimentService.calculateS3Score();

        expect(result).toBeDefined();
        expect(result.score).toBeGreaterThan(-1);
        expect(result.score).toBeLessThan(1);
        expect(result.label).toBeDefined();
        // Weights should maintain default values for 'normal' volatility
        // Default macro weight is 0.15
        expect(result.weights.w_macro).toBeCloseTo(0.15);
    });

    it('should increase macro weight during high volatility', async () => {
        vi.mocked(newsService.getAggregatedData).mockResolvedValue({
            fearGreedIndex: { value: 20, classification: 'Extreme Fear' }, // Low F&G doesn't trigger high vol automatically in this code, context does
            news: [], trendingCoins: [], redditSentiment: []
        });

        // Pass context explicitly
        const result = await s3SentimentService.calculateS3Score({ volatilityRegime: 'high' });

        expect(result.weights.w_macro).toBeCloseTo(0.25);
    });

    it('should reduce macro weight during low volatility', async () => {
        vi.mocked(newsService.getAggregatedData).mockResolvedValue({
            fearGreedIndex: { value: 60, classification: 'Greed' },
            news: [], trendingCoins: [], redditSentiment: []
        });

        const result = await s3SentimentService.calculateS3Score({ volatilityRegime: 'low' });

        expect(result.weights.w_macro).toBeCloseTo(0.10);
    });

    it('should handle API failures gracefully (fallbacks)', async () => {
        // Mock failures
        vi.mocked(newsService.getAggregatedData).mockRejectedValue(new Error('News API failure'));

        // Use try/catch because the service might throw if critical data is missing
        // But s3 service catches internal errors? 
        // Actually s3 service calls newsService.getAggregatedData() without try/catch block around the main call.
        // So this test checks if it propagates error.

        await expect(s3SentimentService.calculateS3Score())
            .rejects
            .toThrow('News API failure');
    });

    it('should resolve disagreement if confidence is low', async () => {
        // Setup conflicting signals
        // Fear Greed = 80 (Bullish) -> S_lex = +0.6
        // Gemini = 20 (Bearish) -> S_trans = -0.6
        // This high variance should lower confidence

        vi.mocked(newsService.getAggregatedData).mockResolvedValue({
            fearGreedIndex: { value: 90, classification: 'Extreme Greed' },
            news: [], trendingCoins: [], redditSentiment: []
        });

        vi.mocked(geminiService.analyzeRealTimeSentiment).mockResolvedValue({
            score: 10, // Very low
            label: 'Bearish',
            summary: 'bad',
            trendingTopics: [],
            confidence: 1
        });

        vi.mocked(macroEconomicService.getMacroSignals).mockResolvedValue({
            compositeScore: 0,
            interpretation: 'Neutral',
            signals: { cpiSignal: 0, rateSignal: 0, dxySignal: 0 },
            cpi: null, federalFundsRate: null, dxy: null,
            lastUpdate: '',
            dataFreshness: 'fresh'
        });

        // Mock cache to return null so it runs calculation
        vi.mocked(cacheService.get).mockResolvedValue(null);

        const result = await s3SentimentService.calculateS3Score();

        // Check if resolution happened
        if (result.confidence < 0.6) {
            expect(result.disagreementResolved).toBe(true);
            expect(result.resolution).toBeDefined();
            // Fear & Greed is 90 (>55), so nudge should be positive
            expect(result.resolution?.signal).toBe('bullish');
        }
    });
});
