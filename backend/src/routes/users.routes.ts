import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { UserQueries } from '../db/queries/users.js';
import { cacheService } from '../services/cache.service.js';
import { CacheKeys, CacheTTL } from '../utils/cache.js';

const router = Router();

/**
 * POST /api/users
 * Create or register a new user
 */
router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const { walletAddress } = req.body;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required',
            });
        }

        const user = await UserQueries.create(walletAddress);

        return res.status(201).json({
            success: true,
            data: user,
        });
    })
);

/**
 * GET /api/users/:address
 * Get user profile and statistics
 */
router.get(
    '/:address',
    asyncHandler(async (req: Request, res: Response) => {
        const { address } = req.params;

        // Try cache first
        const cacheKey = CacheKeys.userStats(address);
        const cached = await cacheService.get(cacheKey);
        if (cached) {
            return res.json({
                success: true,
                data: cached,
                cached: true,
            });
        }

        // Get user from database
        const user = await UserQueries.findByAddress(address);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found',
            });
        }

        // Get user stats
        const stats = await UserQueries.getStats(user.id);

        // Cache result
        await cacheService.set(cacheKey, stats, CacheTTL.userStats);

        return res.json({
            success: true,
            data: stats,
        });
    })
);

export default router;
