import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { UserQueries } from '../db/queries/users.js';
import { AllocationQueries } from '../db/queries/allocations.js';
import { cacheService } from '../services/cache.service.js';
import { CacheKeys, CacheTTL } from '../utils/cache.js';

const router = Router();

/**
 * POST /api/allocations
 * Save user strategy configuration
 */
router.post(
    '/',
    writeLimiter,
    asyncHandler(async (req: Request, res: Response) => {
        const { walletAddress, ecosystem, assetId, assetSymbol, amount, strategyLayers } =
            req.body;

        // Validation
        if (!walletAddress || !ecosystem || !assetId || !assetSymbol || !strategyLayers) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
            });
        }

        // Get or create user
        let user = await UserQueries.findByAddress(walletAddress);
        if (!user) {
            user = await UserQueries.create(walletAddress);
        }

        // Create allocation
        const allocation = await AllocationQueries.create(
            user.id,
            ecosystem,
            assetId,
            assetSymbol,
            strategyLayers,
            amount || 0
        );

        // Invalidate cache
        await cacheService.delete(CacheKeys.userAllocations(walletAddress));

        return res.status(201).json({
            success: true,
            data: allocation,
        });
    })
);

/**
 * GET /api/allocations/:address
 * Fetch all allocations for a user
 */
router.get(
    '/:address',
    asyncHandler(async (req: Request, res: Response) => {
        const { address } = req.params;
        const { ecosystem } = req.query;

        // Try cache first
        const cacheKey = CacheKeys.userAllocations(address);
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
                data: { walletAddress: address, allocations: [] },
            });
        }

        // Get allocations
        const allocations = await AllocationQueries.findByUserId(
            user.id,
            ecosystem as string | undefined
        );

        const result = {
            walletAddress: address,
            allocations,
        };

        // Cache result
        await cacheService.set(cacheKey, result, CacheTTL.userAllocations);

        return res.json({
            success: true,
            data: result,
        });
    })
);

/**
 * DELETE /api/allocations/:address/:assetId
 * Remove asset allocation
 */
router.delete(
    '/:address/:assetId',
    writeLimiter,
    asyncHandler(async (req: Request, res: Response) => {
        const { address, assetId } = req.params;

        const user = await UserQueries.findByAddress(address);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        const deleted = await AllocationQueries.delete(user.id, assetId);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Allocation not found',
            });
        }

        // Invalidate cache
        await cacheService.delete(CacheKeys.userAllocations(address));

        return res.json({
            success: true,
            message: 'Allocation deleted successfully',
        });
    })
);

export default router;
