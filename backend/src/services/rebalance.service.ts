import { logger } from '../middleware/logger.js';
import { RebalanceQueries } from '../db/queries/rebalance.js';
import { UserQueries } from '../db/queries/users.js';
import { geminiService } from './gemini.service.js';
import { blockchainService } from './blockchain.service.js';
import type { UserAllocation, StrategyLayer, MarketSentiment } from '../types/index.js';

interface RebalanceResult {
    executed: boolean;
    activeStrategies: string[];
    estimatedProfit: number;
    gasCost: number;
    reason?: string;
}

export class RebalanceService {
    /**
     * Execute rebalancing for a specific allocation based on current sentiment
     * @param allocation The user's asset allocation
     * @param sentiment Optional sentiment data (if already fetched)
     */
    async executeRebalance(
        allocation: UserAllocation,
        sentiment?: MarketSentiment
    ): Promise<RebalanceResult> {
        try {
            // 1. Get Sentiment if not provided
            if (!sentiment) {
                sentiment = await geminiService.analyzeRealTimeSentiment();
            }

            // 2. Evaluate Strategies
            const activeStrategies = this.evaluateStrategies(allocation.strategyLayers, sentiment);

            if (activeStrategies.length === 0) {
                return {
                    executed: false,
                    activeStrategies: [],
                    estimatedProfit: 0,
                    gasCost: 0,
                    reason: 'No strategies matched current market conditions',
                };
            }

            // 3. Execute On-Chain or Paper Trading
            const isPaperTrading = !blockchainService.isReady();

            if (isPaperTrading) {
                // Paper Trading Mode (Fallback)
                const estimatedGasCost = 3.5;
                const estimatedProfit = this.calculateMockProfit(allocation.amount, activeStrategies.length, sentiment);

                await RebalanceQueries.create({
                    userId: allocation.userId,
                    allocationId: allocation.id,
                    ecosystem: allocation.ecosystem,
                    assetId: allocation.assetId,
                    triggerType: 'sentiment_auto',
                    sentimentScore: sentiment.score,
                    sentimentLabel: sentiment.label,
                    gasCostUsd: estimatedGasCost,
                    profitUsd: estimatedProfit,
                    status: 'success',
                    txHash: `mock_tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                    errorMessage: undefined,
                });

                logger.warn(`⚠️  Paper Trading: Rebalance simulated for User ${allocation.userId}`);

                return {
                    executed: true,
                    activeStrategies,
                    estimatedProfit,
                    gasCost: estimatedGasCost,
                };
            }

            // Real Blockchain Execution
            // Get user wallet address from database
            const userWalletAddress = await UserQueries.getWalletAddress(allocation.userId);

            if (!userWalletAddress) {
                logger.error(`❌ Wallet address not found for user ${allocation.userId}`);
                return {
                    executed: false,
                    activeStrategies,
                    estimatedProfit: 0,
                    gasCost: 0,
                    reason: 'User wallet address not found',
                };
            }

            // Map assetId to contract address
            const assetAddress = this.getAssetContractAddress(allocation.assetId);

            // Estimate gas cost before execution
            const estimatedGasCost = await blockchainService.estimateRebalanceGas(
                userWalletAddress,
                assetAddress
            );

            // Execute rebalance transaction
            const txResult = await blockchainService.executeRebalance(
                userWalletAddress,
                assetAddress
            );

            if (txResult.status === 'failed') {
                // Record failed transaction
                await RebalanceQueries.create({
                    userId: allocation.userId,
                    allocationId: allocation.id,
                    ecosystem: allocation.ecosystem,
                    assetId: allocation.assetId,
                    triggerType: 'sentiment_auto',
                    sentimentScore: sentiment.score,
                    sentimentLabel: sentiment.label,
                    status: 'failed',
                    errorMessage: txResult.error || 'Transaction failed',
                });

                return {
                    executed: false,
                    activeStrategies,
                    estimatedProfit: 0,
                    gasCost: 0,
                    reason: `Transaction failed: ${txResult.error}`,
                };
            }

            // Record pending transaction
            const rebalanceRecord = await RebalanceQueries.create({
                userId: allocation.userId,
                allocationId: allocation.id,
                ecosystem: allocation.ecosystem,
                assetId: allocation.assetId,
                triggerType: 'sentiment_auto',
                sentimentScore: sentiment.score,
                sentimentLabel: sentiment.label,
                gasCostUsd: estimatedGasCost,
                status: 'pending',
                txHash: txResult.txHash,
            });

            logger.info(`✅ Rebalance TX submitted for User ${allocation.userId}: ${txResult.txHash}`);

            // Start background job to monitor transaction
            this.monitorTransaction(rebalanceRecord.id, txResult.txHash).catch(err => {
                logger.error('Failed to monitor transaction:', err);
            });

            return {
                executed: true,
                activeStrategies,
                estimatedProfit: 0, // Will be calculated after TX confirms
                gasCost: estimatedGasCost,
            };

        } catch (error) {
            logger.error(`❌ Rebalance Failed for User ${allocation.userId}:`, error);

            // Record failure
            await RebalanceQueries.create({
                userId: allocation.userId,
                allocationId: allocation.id,
                ecosystem: allocation.ecosystem,
                assetId: allocation.assetId,
                triggerType: 'sentiment_auto',
                status: 'failed',
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            });

            throw error;
        }
    }

    /**
     * Determine which strategy layers are active based on sentiment
     */
    evaluateStrategies(layers: StrategyLayer[], sentiment: MarketSentiment): string[] {
        return layers
            .filter((layer) => {
                switch (layer.condition) {
                    case 'Always':
                        return true;
                    case 'Bullish':
                        return sentiment.score >= 60; // Slightly tuned threshold
                    case 'Bearish':
                        return sentiment.score <= 40;
                    case 'Neutral':
                        return sentiment.score > 40 && sentiment.score < 60;
                    case 'Euphoric':
                        return sentiment.score >= 80;
                    case 'High Volatility':
                        // If we had a vol metric in sentiment we'd use it. 
                        // For now, assume Euphoric/Bearish implies high vol? 
                        // Or stick to 60-40 range check as "Normal"?
                        // Let's use simple score deviation for now.
                        return sentiment.score >= 80 || sentiment.score <= 20;
                    case 'AI Adaptive':
                        // Matches the AI's label exactly if strategy name contains label?
                        // Or just strict confidence check?
                        // Let's say AI Adaptive triggers if Confidence > 0.8
                        return (sentiment.confidence || 0.5) > 0.8;
                    default:
                        return false;
                }
            })
            .map((layer) => layer.strategyId);
    }

    /**
     * Mock profit calculation for paper trading
     */
    private calculateMockProfit(amount: number, strategyCount: number, sentiment: MarketSentiment): number {
        // Base profit 0.5% * leverage of strategies
        const baseRate = 0.005;
        const sentimentBonus = sentiment.score > 60 ? 0.002 : 0;

        return amount * (baseRate * strategyCount + sentimentBonus);
    }

    /**
     * Map asset ID to blockchain contract address
     * @param assetId Internal asset identifier (e.g., 'asset-eth', 'asset-usdc')
     * @returns Contract address or address(0) for ETH
     */
    private getAssetContractAddress(assetId: string): string {
        const assetMap: Record<string, string> = {
            'asset-eth': '0x0000000000000000000000000000000000000000', // ETH = address(0)
            'asset-usdc': '0x08009c047eA5a848997885d69E0352faab9B5Ee3', // Mock USDC on Sepolia
            'asset-wbtc': '0x0000000000000000000000000000000000000000', // Placeholder
            'asset-link': '0x0000000000000000000000000000000000000000', // Placeholder
        };

        return assetMap[assetId] || '0x0000000000000000000000000000000000000000';
    }

    /**
     * Monitor pending transaction and update database when confirmed
     * @param rebalanceId Database ID of the rebalance record
     * @param txHash Transaction hash to monitor
     */
    private async monitorTransaction(rebalanceId: number, txHash: string): Promise<void> {
        try {
            logger.info(`📡 Monitoring transaction ${txHash}...`);

            // Wait for transaction to be mined (async, non-blocking)
            const result = await blockchainService.waitForTransaction(txHash);

            // Update database with final result
            if (result.status === 'success') {
                await RebalanceQueries.update(rebalanceId, {
                    status: 'success',
                    errorMessage: undefined,
                });

                logger.info(`✅ Transaction ${txHash} confirmed successfully`);
            } else {
                await RebalanceQueries.update(rebalanceId, {
                    status: 'failed',
                    errorMessage: result.error || 'Transaction reverted',
                });

                logger.error(`❌ Transaction ${txHash} failed: ${result.error}`);
            }

        } catch (error) {
            logger.error(`❌ Error monitoring transaction ${txHash}:`, error);

            // Mark as failed if monitoring fails
            await RebalanceQueries.update(rebalanceId, {
                status: 'failed',
                errorMessage: error instanceof Error ? error.message : 'Monitoring failed',
            });
        }
    }
}

export const rebalanceService = new RebalanceService();
