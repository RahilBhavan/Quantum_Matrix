import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { writeLimiter } from '../middleware/rateLimiter.js';
import { UserQueries } from '../db/queries/users.js';
import { DepositQueries } from '../db/queries/deposits.js';
import { WithdrawalQueries } from '../db/queries/withdrawals.js';
import { ApprovalQueries } from '../db/queries/approvals.js';

const router = Router();

/**
 * POST /api/vault/deposits
 * Record a new deposit transaction
 */
router.post(
    '/deposits',
    writeLimiter,
    asyncHandler(async (req: Request, res: Response) => {
        const { walletAddress, assetAddress, assetSymbol, amount, amountUsd, txHash } = req.body;

        if (!walletAddress || !assetAddress || !assetSymbol || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: walletAddress, assetAddress, assetSymbol, amount',
            });
        }

        // Get or create user
        let user = await UserQueries.findByAddress(walletAddress);
        if (!user) {
            user = await UserQueries.create(walletAddress);
        }

        const deposit = await DepositQueries.create({
            userId: user.id,
            walletAddress,
            assetAddress,
            assetSymbol,
            amount,
            amountUsd,
            txHash,
        });

        return res.status(201).json({
            success: true,
            data: deposit,
        });
    })
);

/**
 * GET /api/vault/deposits/:address
 * Get deposit history for a wallet
 */
router.get(
    '/deposits/:address',
    asyncHandler(async (req: Request, res: Response) => {
        const { address } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const result = await DepositQueries.findByWallet(address, limit, offset);

        return res.json({
            success: true,
            data: result,
        });
    })
);

/**
 * PATCH /api/vault/deposits/:txHash
 * Update deposit status (called by transaction monitoring service)
 */
router.patch(
    '/deposits/:txHash',
    asyncHandler(async (req: Request, res: Response) => {
        const { txHash } = req.params;
        const { status, errorMessage, gasCostEth, gasCostUsd, blockNumber } = req.body;

        if (!status || !['success', 'failed'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be "success" or "failed"',
            });
        }

        const deposit = await DepositQueries.findByTxHash(txHash);
        if (!deposit) {
            return res.status(404).json({
                success: false,
                error: 'Deposit not found',
            });
        }

        await DepositQueries.updateStatus(deposit.id, status, {
            errorMessage,
            gasCostEth,
            gasCostUsd,
            blockNumber,
        });

        return res.json({
            success: true,
            message: 'Deposit status updated',
        });
    })
);

/**
 * POST /api/vault/withdrawals
 * Record a new withdrawal transaction
 */
router.post(
    '/withdrawals',
    writeLimiter,
    asyncHandler(async (req: Request, res: Response) => {
        const { walletAddress, assetAddress, assetSymbol, amount, amountUsd, txHash } = req.body;

        if (!walletAddress || !assetAddress || !assetSymbol || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: walletAddress, assetAddress, assetSymbol, amount',
            });
        }

        // Get or create user
        let user = await UserQueries.findByAddress(walletAddress);
        if (!user) {
            user = await UserQueries.create(walletAddress);
        }

        const withdrawal = await WithdrawalQueries.create({
            userId: user.id,
            walletAddress,
            assetAddress,
            assetSymbol,
            amount,
            amountUsd,
            txHash,
        });

        return res.status(201).json({
            success: true,
            data: withdrawal,
        });
    })
);

/**
 * GET /api/vault/withdrawals/:address
 * Get withdrawal history for a wallet
 */
router.get(
    '/withdrawals/:address',
    asyncHandler(async (req: Request, res: Response) => {
        const { address } = req.params;
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;

        const result = await WithdrawalQueries.findByWallet(address, limit, offset);

        return res.json({
            success: true,
            data: result,
        });
    })
);

/**
 * PATCH /api/vault/withdrawals/:txHash
 * Update withdrawal status (called by transaction monitoring service)
 */
router.patch(
    '/withdrawals/:txHash',
    asyncHandler(async (req: Request, res: Response) => {
        const { txHash } = req.params;
        const { status, errorMessage, gasCostEth, gasCostUsd, blockNumber } = req.body;

        if (!status || !['success', 'failed'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status. Must be "success" or "failed"',
            });
        }

        const withdrawal = await WithdrawalQueries.findByTxHash(txHash);
        if (!withdrawal) {
            return res.status(404).json({
                success: false,
                error: 'Withdrawal not found',
            });
        }

        await WithdrawalQueries.updateStatus(withdrawal.id, status, {
            errorMessage,
            gasCostEth,
            gasCostUsd,
            blockNumber,
        });

        return res.json({
            success: true,
            message: 'Withdrawal status updated',
        });
    })
);

/**
 * POST /api/vault/approvals
 * Record token approval
 */
router.post(
    '/approvals',
    writeLimiter,
    asyncHandler(async (req: Request, res: Response) => {
        const { walletAddress, tokenAddress, spenderAddress, approvedAmount, txHash } = req.body;

        if (!walletAddress || !tokenAddress || !spenderAddress || !approvedAmount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: walletAddress, tokenAddress, spenderAddress, approvedAmount',
            });
        }

        await ApprovalQueries.upsert({
            walletAddress,
            tokenAddress,
            spenderAddress,
            approvedAmount,
            txHash,
        });

        return res.json({
            success: true,
            message: 'Approval recorded successfully',
        });
    })
);

/**
 * GET /api/vault/approvals/:address
 * Get all token approvals for a wallet
 */
router.get(
    '/approvals/:address',
    asyncHandler(async (req: Request, res: Response) => {
        const { address } = req.params;

        const approvals = await ApprovalQueries.getWalletApprovals(address);

        return res.json({
            success: true,
            data: approvals,
        });
    })
);

export default router;
