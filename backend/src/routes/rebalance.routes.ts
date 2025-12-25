import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { UserQueries } from '../db/queries/users.js';
import { AllocationQueries } from '../db/queries/allocations.js';
import { RebalanceQueries } from '../db/queries/rebalance.js';
import { cacheService } from '../services/cache.service.js';
import { CacheKeys, CacheTTL } from '../utils/cache.js';

const router = Router();

/**
 * POST /api/rebalance/simulate
 * Simulate a rebalance without executing
 */
router.post(
    '/simulate',
    asyncHandler(async (req, res) => {
        const { walletAddress, allocationId, currentSentiment } = req.body;

        if (!walletAddress || !allocationId || !currentSentiment) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
            });
        }

        // Get allocation
        const allocation = await AllocationQueries.findById(allocationId);
        if (!allocation) {
            return res.status(404).json({
                success: false,
                error: 'Allocation not found',
            });
        }

        // Determine which strategies should execute based on sentiment
        const activeStrategies = allocation.strategyLayers
            .filter((layer) => {
                switch (layer.condition) {
                    case 'Always':
                        return true;
                    case 'Bullish':
                        return currentSentiment.score >= 61;
                    case 'Bearish':
                        return currentSentiment.score <= 40;
                    case 'Neutral':
                        return currentSentiment.score > 40 && currentSentiment.score < 61;
                    case 'Euphoric':
                        return currentSentiment.score >= 81;
                    default:
                        return false;
                }
            })
            .map((layer) => layer.strategyId);

        // Simulate gas cost and profit (placeholder logic)
        const estimatedGasCost = 3.5;
        const estimatedProfit = 125.0;

        res.json({
            success: true,
            data: {
                activeStrategies,
                estimatedGasCost,
                estimatedProfit,
                recommendation:
                    estimatedProfit > estimatedGasCost * 5
                        ? `Execute - profit exceeds gas cost by ${Math.round(estimatedProfit / estimatedGasCost)}x`
                        : 'Hold - profit margin too low',
            },
        });
    })
);

/**
 * GET /api/rebalance/history/:address
 * Get rebalance history for a user
 */
router.get(
    '/history/:address',
    asyncHandler(async (req, res) => {
        const { address } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        // Try cache first
        const cacheKey = CacheKeys.rebalanceHistory(address, limit, offset);
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            return res.json({
                success: true,
                data: cached,
                cached: true,
            });
        }

        // Get user
        const user = await UserQueries.findByAddress(address);
        if (!user) {
            return res.json({
                success: true,
                data: { history: [], total: 0, limit, offset },
            });
        }

        // Get rebalance history
        const { data, total } = await RebalanceQueries.findByUserId(user.id, limit, offset);

        const result = {
            history: data,
            total,
            limit,
            offset,
        };

        // Cache result
        await cacheService.set(cacheKey, result, CacheTTL.rebalanceHistory);

        res.json({
            success: true,
            data: result,
        });
    })
);

export default router;
