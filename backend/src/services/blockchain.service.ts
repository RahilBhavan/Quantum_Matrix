import { ethers } from 'ethers';
import { logger } from '../middleware/logger.js';
import { CONTRACTS, ABIS } from '../config/contracts.js';

interface TransactionResult {
    txHash: string;
    status: 'pending' | 'success' | 'failed';
    gasUsed?: bigint;
    gasCostEth?: string;
    gasCostUsd?: number;
    error?: string;
}

export class BlockchainService {
    private provider: ethers.JsonRpcProvider | null = null;
    private signer: ethers.Wallet | null = null;
    private coreVault: ethers.Contract | null = null;
    private isInitialized = false;

    /**
     * Initialize blockchain service with provider and signer
     */
    async initialize(): Promise<void> {
        try {
            const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
            const privateKey = process.env.KEEPER_PRIVATE_KEY;
            const chainId = parseInt(process.env.BLOCKCHAIN_CHAIN_ID || '11155111');

            if (!rpcUrl || !privateKey) {
                logger.warn('⚠️  Blockchain credentials not configured. Rebalancing will use paper trading mode.');
                return;
            }

            // Initialize provider
            this.provider = new ethers.JsonRpcProvider(rpcUrl, chainId);

            // Initialize signer
            this.signer = new ethers.Wallet(privateKey, this.provider);

            // Get contract address based on chain ID
            const vaultAddress = chainId === 11155111
                ? CONTRACTS.sepolia.CoreVault
                : process.env.CORE_VAULT_ADDRESS;

            if (!vaultAddress) {
                throw new Error(`CoreVault address not configured for chain ${chainId}`);
            }

            // Initialize CoreVault contract
            this.coreVault = new ethers.Contract(
                vaultAddress,
                ABIS.CoreVault as any,
                this.signer
            );

            // Verify keeper is authorized
            const isKeeper = await this.coreVault.keepers(this.signer.address);
            if (!isKeeper) {
                logger.warn(`⚠️  Wallet ${this.signer.address} is not registered as keeper in CoreVault`);
            }

            this.isInitialized = true;
            logger.info(`✅ Blockchain service initialized on chain ${chainId}`);
            logger.info(`📍 CoreVault: ${vaultAddress}`);
            logger.info(`🔑 Keeper: ${this.signer.address}`);

        } catch (error) {
            logger.error('❌ Failed to initialize blockchain service:', error);
            this.isInitialized = false;
        }
    }

    /**
     * Check if blockchain service is ready
     */
    isReady(): boolean {
        return this.isInitialized && this.coreVault !== null && this.signer !== null;
    }

    /**
     * Execute rebalance on-chain
     * @param userAddress Address of the user whose allocation to rebalance
     * @param assetAddress Address of the asset (ERC20 token or address(0) for ETH)
     * @returns Transaction result with hash and status
     */
    async executeRebalance(
        userAddress: string,
        assetAddress: string
    ): Promise<TransactionResult> {
        if (!this.isReady()) {
            throw new Error('Blockchain service not initialized');
        }

        try {
            logger.info(`🔄 Executing on-chain rebalance for user ${userAddress}, asset ${assetAddress}`);

            // Estimate gas
            const gasEstimate = await this.coreVault!.executeRebalance.estimateGas(
                userAddress,
                assetAddress
            );

            const gasLimit = (gasEstimate * 120n) / 100n; // Add 20% buffer

            // Get current gas price
            const feeData = await this.provider!.getFeeData();
            const gasPrice = feeData.gasPrice || 0n;

            // Submit transaction
            const tx = await this.coreVault!.executeRebalance(
                userAddress,
                assetAddress,
                {
                    gasLimit,
                    gasPrice,
                }
            );

            logger.info(`📤 Transaction submitted: ${tx.hash}`);

            // Return pending status immediately
            return {
                txHash: tx.hash,
                status: 'pending',
            };

        } catch (error: any) {
            logger.error('❌ Rebalance transaction failed:', error);

            return {
                txHash: '',
                status: 'failed',
                error: error.message || 'Unknown error',
            };
        }
    }

    /**
     * Wait for transaction confirmation and get final result
     * @param txHash Transaction hash to monitor
     * @param ethPriceUsd Current ETH price in USD for gas cost calculation
     * @returns Final transaction result
     */
    async waitForTransaction(
        txHash: string,
        ethPriceUsd: number = 2800
    ): Promise<TransactionResult> {
        if (!this.isReady()) {
            throw new Error('Blockchain service not initialized');
        }

        try {
            logger.info(`⏳ Waiting for transaction ${txHash} to be mined...`);

            // Wait for transaction receipt (max 5 confirmations)
            const receipt = await this.provider!.waitForTransaction(txHash, 1, 300000); // 5 min timeout

            if (!receipt) {
                throw new Error('Transaction receipt not found');
            }

            const gasUsed = receipt.gasUsed;
            const effectiveGasPrice = receipt.gasPrice || 0n;
            const gasCostWei = gasUsed * effectiveGasPrice;
            const gasCostEth = ethers.formatEther(gasCostWei);
            const gasCostUsd = parseFloat(gasCostEth) * ethPriceUsd;

            const status = receipt.status === 1 ? 'success' : 'failed';

            logger.info(`${status === 'success' ? '✅' : '❌'} Transaction ${status}: ${txHash}`);
            logger.info(`⛽ Gas used: ${gasUsed.toString()} | Cost: $${gasCostUsd.toFixed(2)}`);

            return {
                txHash,
                status,
                gasUsed,
                gasCostEth,
                gasCostUsd,
            };

        } catch (error: any) {
            logger.error(`❌ Error waiting for transaction ${txHash}:`, error);

            return {
                txHash,
                status: 'failed',
                error: error.message || 'Unknown error',
            };
        }
    }

    /**
     * Update sentiment score on-chain
     * @param sentimentScore Score from 0-100
     * @returns Transaction hash
     */
    async updateSentiment(sentimentScore: number): Promise<string | null> {
        if (!this.isReady()) {
            logger.warn('⚠️  Cannot update sentiment: blockchain service not initialized');
            return null;
        }

        try {
            const score = Math.max(0, Math.min(100, Math.round(sentimentScore)));

            logger.info(`📊 Updating on-chain sentiment to ${score}`);

            const tx = await this.coreVault!.updateSentiment(score);
            await tx.wait(1);

            logger.info(`✅ Sentiment updated on-chain: ${tx.hash}`);
            return tx.hash;

        } catch (error) {
            logger.error('❌ Failed to update sentiment on-chain:', error);
            return null;
        }
    }

    /**
     * Get current on-chain sentiment score
     */
    async getCurrentSentiment(): Promise<number | null> {
        if (!this.isReady()) {
            return null;
        }

        try {
            const sentiment = await this.coreVault!.currentSentiment();
            return Number(sentiment);
        } catch (error) {
            logger.error('❌ Failed to read sentiment from chain:', error);
            return null;
        }
    }

    /**
     * Estimate gas cost for a rebalance operation
     * @param userAddress User address
     * @param assetAddress Asset address
     * @param ethPriceUsd Current ETH price in USD
     * @returns Estimated gas cost in USD
     */
    async estimateRebalanceGas(
        userAddress: string,
        assetAddress: string,
        ethPriceUsd: number = 2800
    ): Promise<number> {
        if (!this.isReady()) {
            return 3.5; // Fallback to mock value
        }

        try {
            const gasEstimate = await this.coreVault!.executeRebalance.estimateGas(
                userAddress,
                assetAddress
            );

            const feeData = await this.provider!.getFeeData();
            const gasPrice = feeData.gasPrice || 0n;

            const gasCostWei = gasEstimate * gasPrice;
            const gasCostEth = ethers.formatEther(gasCostWei);
            const gasCostUsd = parseFloat(gasCostEth) * ethPriceUsd;

            return gasCostUsd;

        } catch (error) {
            logger.error('❌ Failed to estimate gas:', error);
            return 3.5; // Fallback to mock value
        }
    }

    /**
     * Check if contract is paused
     */
    async isPaused(): Promise<boolean> {
        if (!this.isReady()) {
            return false;
        }

        try {
            return await this.coreVault!.paused();
        } catch (error) {
            logger.error('❌ Failed to check pause status:', error);
            return false;
        }
    }

    /**
     * Get user's allocation details from contract
     */
    async getUserAllocation(userAddress: string, assetAddress: string): Promise<any> {
        if (!this.isReady()) {
            return null;
        }

        try {
            const allocation = await this.coreVault!.userAllocations(userAddress, assetAddress);
            return {
                asset: allocation[0],
                totalDeposited: allocation[1],
                lastRebalance: allocation[2],
            };
        } catch (error) {
            logger.error('❌ Failed to get user allocation:', error);
            return null;
        }
    }
}

export const blockchainService = new BlockchainService();
