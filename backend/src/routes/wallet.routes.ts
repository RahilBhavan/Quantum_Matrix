import { Router, Request, Response } from 'express';
import { walletBalanceService } from '../services/wallet-balance.service.js';
import { logger } from '../middleware/logger.js';

const router = Router();

/**
 * GET /api/wallet/balances/:address
 * Fetch all token balances for a wallet address
 * Query params: chainId (optional, defaults to 1 for Ethereum mainnet)
 */
router.get('/balances/:address', async (req: Request, res: Response) => {
    try {
        const { address } = req.params;
        const chainId = parseInt(req.query.chainId as string) || 1;

        // Validate address format
        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Ethereum address format',
            });
        }

        // Validate chain ID
        const supportedChains = walletBalanceService.getSupportedChains();
        if (!supportedChains.includes(chainId)) {
            return res.status(400).json({
                success: false,
                error: `Chain ${chainId} not supported. Supported chains: ${supportedChains.join(', ')}`,
            });
        }

        const balances = await walletBalanceService.getWalletBalances(address, chainId);

        return res.json({
            success: true,
            data: balances,
        });

    } catch (error) {
        logger.error('Failed to fetch wallet balances:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch wallet balances',
        });
    }
});

/**
 * GET /api/wallet/tokens/:chainId
 * Get list of supported tokens for a chain
 */
router.get('/tokens/:chainId', async (req: Request, res: Response) => {
    try {
        const chainId = parseInt(req.params.chainId);

        const tokens = walletBalanceService.getSupportedTokens(chainId);

        if (tokens.length === 0) {
            return res.status(404).json({
                success: false,
                error: `Chain ${chainId} not supported`,
            });
        }

        return res.json({
            success: true,
            data: {
                chainId,
                tokens,
            },
        });

    } catch (error) {
        logger.error('Failed to fetch supported tokens:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch supported tokens',
        });
    }
});

/**
 * GET /api/wallet/chains
 * Get list of supported chains
 */
router.get('/chains', async (_req: Request, res: Response) => {
    try {
        const chains = walletBalanceService.getSupportedChains();

        const chainInfo = chains.map(chainId => ({
            chainId,
            name: getChainName(chainId),
        }));

        return res.json({
            success: true,
            data: chainInfo,
        });

    } catch (error) {
        logger.error('Failed to fetch supported chains:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch supported chains',
        });
    }
});

/**
 * POST /api/wallet/refresh/:address
 * Clear cache and refetch balances for a wallet
 */
router.post('/refresh/:address', async (req: Request, res: Response) => {
    try {
        const { address } = req.params;
        const chainId = parseInt(req.query.chainId as string);

        // Validate address format
        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Ethereum address format',
            });
        }

        // Clear cache
        await walletBalanceService.clearCache(address, chainId);

        // Refetch balances
        const balances = chainId
            ? await walletBalanceService.getWalletBalances(address, chainId)
            : null;

        return res.json({
            success: true,
            message: 'Cache cleared successfully',
            data: balances,
        });

    } catch (error) {
        logger.error('Failed to refresh wallet balances:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to refresh wallet balances',
        });
    }
});

/**
 * GET /api/wallet/prices
 * Get current prices for multiple tokens
 * Query params: ids (comma-separated coingecko IDs)
 */
router.get('/prices', async (req: Request, res: Response) => {
    try {
        const idsParam = req.query.ids as string;

        if (!idsParam) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameter: ids',
            });
        }

        const ids = idsParam.split(',').map(id => id.trim());

        if (ids.length === 0 || ids.length > 100) {
            return res.status(400).json({
                success: false,
                error: 'Invalid number of IDs (must be between 1 and 100)',
            });
        }

        const prices = await walletBalanceService.getMultipleTokenPrices(ids);

        return res.json({
            success: true,
            data: prices,
        });

    } catch (error) {
        logger.error('Failed to fetch token prices:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch token prices',
        });
    }
});

// Helper function to get chain name
function getChainName(chainId: number): string {
    const names: Record<number, string> = {
        1: 'Ethereum Mainnet',
        11155111: 'Sepolia Testnet',
        42161: 'Arbitrum One',
    };
    return names[chainId] || `Chain ${chainId}`;
}

export default router;
