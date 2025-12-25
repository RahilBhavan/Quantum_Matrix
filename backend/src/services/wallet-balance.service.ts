import { ethers } from 'ethers';
import axios from 'axios';
import { logger } from '../middleware/logger.js';
import redis from '../config/redis.js';
import ERC20_ABI from '../config/abi/ERC20.json' with { type: 'json' };

interface TokenConfig {
    address: string;
    symbol: string;
    decimals: number;
    coingeckoId: string;
}

interface TokenBalance {
    symbol: string;
    balance: string; // Formatted balance (e.g., "1.234")
    balanceRaw: string; // Raw balance in wei
    balanceUsd: number;
    price: number;
    address: string;
}

interface WalletBalances {
    address: string;
    chainId: number;
    totalBalanceUsd: number;
    tokens: TokenBalance[];
    lastUpdated: Date;
}

// Token configurations by chain
const TOKEN_CONFIGS: Record<number, Record<string, TokenConfig>> = {
    // Ethereum Mainnet
    1: {
        ETH: { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18, coingeckoId: 'ethereum' },
        USDC: { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin' },
        USDT: { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', decimals: 6, coingeckoId: 'tether' },
        WBTC: { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', decimals: 8, coingeckoId: 'wrapped-bitcoin' },
        UNI: { address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', symbol: 'UNI', decimals: 18, coingeckoId: 'uniswap' },
        LDO: { address: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32', symbol: 'LDO', decimals: 18, coingeckoId: 'lido-dao' },
        LINK: { address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', symbol: 'LINK', decimals: 18, coingeckoId: 'chainlink' },
    },
    // Sepolia Testnet
    11155111: {
        ETH: { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18, coingeckoId: 'ethereum' },
        USDC: { address: '0x08009c047eA5a848997885d69E0352faab9B5Ee3', symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin' },
    },
    // Arbitrum
    42161: {
        ETH: { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', decimals: 18, coingeckoId: 'ethereum' },
        ARB: { address: '0x912CE59144191C1204E64559FE8253a0e49E6548', symbol: 'ARB', decimals: 18, coingeckoId: 'arbitrum' },
        USDC: { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', decimals: 6, coingeckoId: 'usd-coin' },
        GMX: { address: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a', symbol: 'GMX', decimals: 18, coingeckoId: 'gmx' },
        RDNT: { address: '0x3082CC23568eA640225c2467653dB90e9250AaA0', symbol: 'RDNT', decimals: 18, coingeckoId: 'radiant-capital' },
    }
};

// RPC URLs by chain (fallback if not in env)
const DEFAULT_RPC_URLS: Record<number, string> = {
    1: 'https://eth.llamarpc.com',
    11155111: 'https://sepolia.gateway.tenderly.co',
    42161: 'https://arb1.arbitrum.io/rpc',
};

export class WalletBalanceService {
    private providers: Map<number, ethers.JsonRpcProvider> = new Map();
    private priceCache: Map<string, { price: number; timestamp: number }> = new Map();
    private readonly PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    private readonly BALANCE_CACHE_TTL = 30 * 1000; // 30 seconds

    /**
     * Get provider for a specific chain
     */
    private getProvider(chainId: number): ethers.JsonRpcProvider {
        if (!this.providers.has(chainId)) {
            const rpcUrl = this.getRpcUrl(chainId);
            const provider = new ethers.JsonRpcProvider(rpcUrl, chainId);
            this.providers.set(chainId, provider);
        }
        return this.providers.get(chainId)!;
    }

    /**
     * Get RPC URL for chain
     */
    private getRpcUrl(chainId: number): string {
        // Try to get from env first (MAINNET_RPC_URL, SEPOLIA_RPC_URL, etc.)
        if (chainId === 1 && process.env.MAINNET_RPC_URL) {
            return process.env.MAINNET_RPC_URL;
        }
        if (chainId === 11155111 && process.env.BLOCKCHAIN_RPC_URL) {
            return process.env.BLOCKCHAIN_RPC_URL;
        }
        if (chainId === 42161 && process.env.ARBITRUM_RPC_URL) {
            return process.env.ARBITRUM_RPC_URL;
        }

        // Fallback to default public RPCs
        return DEFAULT_RPC_URLS[chainId] || DEFAULT_RPC_URLS[1];
    }

    /**
     * Fetch all token balances for a wallet on a specific chain
     */
    async getWalletBalances(
        walletAddress: string,
        chainId: number = 1
    ): Promise<WalletBalances> {
        try {
            // Check cache first
            const cacheKey = `wallet_balances:${chainId}:${walletAddress.toLowerCase()}`;
            const cached = await this.getCachedBalances(cacheKey);
            if (cached) {
                logger.info(`✅ Returning cached balances for ${walletAddress.slice(0, 8)}...`);
                return cached;
            }

            logger.info(`🔍 Fetching balances for ${walletAddress.slice(0, 8)}... on chain ${chainId}`);

            const provider = this.getProvider(chainId);
            const tokenConfigs = TOKEN_CONFIGS[chainId];

            if (!tokenConfigs) {
                throw new Error(`Chain ${chainId} not supported`);
            }

            // Fetch all balances in parallel
            const balancePromises = Object.values(tokenConfigs).map(async (config) => {
                return this.getTokenBalance(walletAddress, config, provider, chainId);
            });

            const tokens = await Promise.all(balancePromises);

            // Filter out zero balances and calculate total
            const nonZeroTokens = tokens.filter(t => parseFloat(t.balance) > 0);
            const totalBalanceUsd = nonZeroTokens.reduce((sum, t) => sum + t.balanceUsd, 0);

            const result: WalletBalances = {
                address: walletAddress,
                chainId,
                totalBalanceUsd,
                tokens: nonZeroTokens,
                lastUpdated: new Date(),
            };

            // Cache the result
            await this.cacheBalances(cacheKey, result);

            logger.info(`✅ Fetched ${nonZeroTokens.length} token balances (Total: $${totalBalanceUsd.toFixed(2)})`);

            return result;

        } catch (error) {
            logger.error(`❌ Failed to fetch wallet balances for ${walletAddress}:`, error);
            throw error;
        }
    }

    /**
     * Get balance for a single token
     */
    private async getTokenBalance(
        walletAddress: string,
        config: TokenConfig,
        provider: ethers.JsonRpcProvider,
        _chainId: number
    ): Promise<TokenBalance> {
        try {
            let balanceRaw: bigint;

            // ETH balance (native token)
            if (config.address === '0x0000000000000000000000000000000000000000') {
                balanceRaw = await provider.getBalance(walletAddress);
            } else {
                // ERC20 token balance
                const tokenContract = new ethers.Contract(config.address, ERC20_ABI, provider);
                balanceRaw = await tokenContract.balanceOf(walletAddress);
            }

            // Format balance
            const balance = ethers.formatUnits(balanceRaw, config.decimals);

            // Get price
            const price = await this.getTokenPrice(config.coingeckoId);

            // Calculate USD value
            const balanceUsd = parseFloat(balance) * price;

            return {
                symbol: config.symbol,
                balance,
                balanceRaw: balanceRaw.toString(),
                balanceUsd,
                price,
                address: config.address,
            };

        } catch (error) {
            logger.warn(`⚠️  Failed to fetch balance for ${config.symbol}:`, error);
            // Return zero balance on error
            return {
                symbol: config.symbol,
                balance: '0',
                balanceRaw: '0',
                balanceUsd: 0,
                price: 0,
                address: config.address,
            };
        }
    }

    /**
     * Fetch token price from CoinGecko
     */
    private async getTokenPrice(coingeckoId: string): Promise<number> {
        try {
            // Check in-memory cache first
            const cached = this.priceCache.get(coingeckoId);
            if (cached && Date.now() - cached.timestamp < this.PRICE_CACHE_TTL) {
                return cached.price;
            }

            // Check Redis cache
            const redisCacheKey = `price:${coingeckoId}`;
            const cachedPrice = await redis.get(redisCacheKey);
            if (cachedPrice) {
                const price = parseFloat(cachedPrice);
                this.priceCache.set(coingeckoId, { price, timestamp: Date.now() });
                return price;
            }

            // Fetch from CoinGecko
            const response = await axios.get(
                `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd`,
                { timeout: 5000 }
            );

            const price = response.data[coingeckoId]?.usd || 0;

            // Cache in Redis (5 min TTL)
            await redis.setex(redisCacheKey, 300, price.toString());

            // Cache in memory
            this.priceCache.set(coingeckoId, { price, timestamp: Date.now() });

            return price;

        } catch (error) {
            logger.warn(`⚠️  Failed to fetch price for ${coingeckoId}:`, error);
            return 0; // Return 0 if price fetch fails
        }
    }

    /**
     * Get multiple token prices at once
     */
    async getMultipleTokenPrices(coingeckoIds: string[]): Promise<Record<string, number>> {
        try {
            const idsParam = coingeckoIds.join(',');
            const response = await axios.get(
                `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=usd`,
                { timeout: 10000 }
            );

            const prices: Record<string, number> = {};
            for (const id of coingeckoIds) {
                prices[id] = response.data[id]?.usd || 0;
                if (prices[id] > 0) {
                    // Cache each price
                    await redis.setex(`price:${id}`, 300, prices[id].toString());
                    this.priceCache.set(id, { price: prices[id], timestamp: Date.now() });
                }
            }

            return prices;

        } catch (error) {
            logger.error('❌ Failed to fetch multiple prices:', error);
            return {};
        }
    }

    /**
     * Cache balances in Redis
     */
    private async cacheBalances(key: string, balances: WalletBalances): Promise<void> {
        try {
            await redis.setex(
                key,
                this.BALANCE_CACHE_TTL / 1000,
                JSON.stringify(balances)
            );
        } catch (error) {
            logger.warn('Failed to cache balances:', error);
        }
    }

    /**
     * Get cached balances from Redis
     */
    private async getCachedBalances(key: string): Promise<WalletBalances | null> {
        try {
            const cached = await redis.get(key);
            if (cached) {
                const parsed = JSON.parse(cached);
                parsed.lastUpdated = new Date(parsed.lastUpdated);
                return parsed;
            }
        } catch (error) {
            logger.warn('Failed to get cached balances:', error);
        }
        return null;
    }

    /**
     * Get supported tokens for a chain
     */
    getSupportedTokens(chainId: number): TokenConfig[] {
        return Object.values(TOKEN_CONFIGS[chainId] || {});
    }

    /**
     * Get all supported chains
     */
    getSupportedChains(): number[] {
        return Object.keys(TOKEN_CONFIGS).map(Number);
    }

    /**
     * Clear cache for a wallet
     */
    async clearCache(walletAddress: string, chainId?: number): Promise<void> {
        try {
            if (chainId) {
                const key = `wallet_balances:${chainId}:${walletAddress.toLowerCase()}`;
                await redis.del(key);
                logger.info(`🗑️  Cleared cache for ${walletAddress} on chain ${chainId}`);
            } else {
                // Clear all chains
                const chains = this.getSupportedChains();
                const keys = chains.map(c => `wallet_balances:${c}:${walletAddress.toLowerCase()}`);
                if (keys.length > 0) {
                    await redis.del(...keys);
                }
                logger.info(`🗑️  Cleared cache for ${walletAddress} on all chains`);
            }
        } catch (error) {
            logger.error('Failed to clear cache:', error);
        }
    }
}

export const walletBalanceService = new WalletBalanceService();
