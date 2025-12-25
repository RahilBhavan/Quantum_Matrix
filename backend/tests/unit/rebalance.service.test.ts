import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
vi.mock('../../src/services/rebalance.service.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../src/services/rebalance.service.js')>();
    return { ...actual };
});
vi.mock('../../src/services/gemini.service.js');
vi.mock('../../src/db/queries/rebalance.js');

// Config mock
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

import { rebalanceService } from '../../src/services/rebalance.service.js';
import { geminiService } from '../../src/services/gemini.service.js';
import { RebalanceQueries } from '../../src/db/queries/rebalance.js';
import type { StrategyLayer, UserAllocation, MarketSentiment } from '../../src/types/index.js';

describe('RebalanceService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockAllocation: UserAllocation = {
        id: 1,
        userId: 101,
        ecosystem: 'ethereum',
        assetId: 'udsc',
        assetSymbol: 'USDC',
        amount: 1000,
        strategyLayers: [],
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const mockSentiment: MarketSentiment = {
        score: 75,
        label: 'Bullish',
        summary: 'Bullish market',
        trendingTopics: [],
        confidence: 0.9,
    };

    describe('evaluateStrategies', () => {
        it('should trigger Always condition', () => {
            const layers: StrategyLayer[] = [{ strategyId: 'strat-1', condition: 'Always', weight: 100 }];
            const result = rebalanceService.evaluateStrategies(layers, mockSentiment);
            expect(result).toContain('strat-1');
        });

        it('should trigger Bullish condition when score >= 60', () => {
            const layers: StrategyLayer[] = [{ strategyId: 'strat-bull', condition: 'Bullish', weight: 100 }];
            const result = rebalanceService.evaluateStrategies(layers, { ...mockSentiment, score: 65 });
            expect(result).toContain('strat-bull');
        });

        it('should NOT trigger Bullish condition when score < 60', () => {
            const layers: StrategyLayer[] = [{ strategyId: 'strat-bull', condition: 'Bullish', weight: 100 }];
            const result = rebalanceService.evaluateStrategies(layers, { ...mockSentiment, score: 50 });
            expect(result).not.toContain('strat-bull');
        });
    });

    describe('executeRebalance', () => {
        it('should execute paper trade when strategies match', async () => {
            const allocation = { ...mockAllocation, strategyLayers: [{ strategyId: 'strat-always', condition: 'Always', weight: 100 }] };

            // RebalanceQueries.create mock
            const createSpy = vi.spyOn(RebalanceQueries, 'create').mockResolvedValue({} as any);

            const result = await rebalanceService.executeRebalance(allocation as any, mockSentiment);

            expect(result.executed).toBe(true);
            expect(result.activeStrategies).toContain('strat-always');
            expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
                status: 'success',
                triggerType: 'sentiment_auto'
            }));
        });

        it('should NOT execute if no strategies match', async () => {
            const allocation = { ...mockAllocation, strategyLayers: [{ strategyId: 'strat-bear', condition: 'Bearish', weight: 100 }] };

            const createSpy = vi.spyOn(RebalanceQueries, 'create');

            // Sentiment is Bullish (75), so Bearish strat won't match
            const result = await rebalanceService.executeRebalance(allocation as any, mockSentiment);

            expect(result.executed).toBe(false);
            expect(createSpy).not.toHaveBeenCalled();
        });

        it('should fetch sentiment if not provided', async () => {
            const allocation = { ...mockAllocation, strategyLayers: [{ strategyId: 'strat-1', condition: 'Always', weight: 100 }] };

            vi.mocked(geminiService.analyzeRealTimeSentiment).mockResolvedValue(mockSentiment);
            const createSpy = vi.spyOn(RebalanceQueries, 'create').mockResolvedValue({} as any);

            await rebalanceService.executeRebalance(allocation as any);

            expect(geminiService.analyzeRealTimeSentiment).toHaveBeenCalled();
            expect(createSpy).toHaveBeenCalled();
        });
    });
});
