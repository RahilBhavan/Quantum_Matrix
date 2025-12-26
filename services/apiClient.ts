/// <reference types="vite/client" />
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export class ApiClient {
    private static async request<T>(
        endpoint: string,
        options?: RequestInit
    ): Promise<T> {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers,
                },
                ...options,
            });

            const json: ApiResponse<T> = await response.json();

            if (!response.ok || !json.success) {
                throw new Error(json.error || 'API request failed');
            }

            return json.data as T;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    }

    // Sentiment endpoints
    /**
     * @deprecated Use getS3Sentiment() instead for multi-model sentiment analysis
     * This endpoint only provides Gemini-based sentiment and is being phased out.
     */
    static async getCurrentSentiment() {
        return this.request('/api/sentiment/current');
    }

    static async getS3Sentiment(context?: {
        dataSource?: 'social_media' | 'news' | 'mixed';
        timeHorizon?: 'short' | 'medium' | 'long';
        assetMaturity?: 'new' | 'established';
        volatilityRegime?: 'low' | 'normal' | 'high';
    }) {
        const params = new URLSearchParams();
        if (context?.dataSource) params.append('dataSource', context.dataSource);
        if (context?.timeHorizon) params.append('timeHorizon', context.timeHorizon);
        if (context?.assetMaturity) params.append('assetMaturity', context.assetMaturity);
        if (context?.volatilityRegime) params.append('volatilityRegime', context.volatilityRegime);
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request(`/api/sentiment/s3${query}`);
    }

    static async getSentimentHistory(days: number = 7) {
        return this.request(`/api/sentiment/history?days=${days}`);
    }

    static async getPortfolioRecommendation(data: {
        sentiment: any;
        ecosystem: string;
        assets: Array<{ id: string; symbol: string }>;
        strategies: Array<{ id: string; name: string; risk: string; type: string }>;
    }) {
        return this.request('/api/sentiment/recommendation', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // User endpoints
    static async createUser(walletAddress: string) {
        return this.request('/api/users', {
            method: 'POST',
            body: JSON.stringify({ walletAddress }),
        });
    }

    static async getUserStats(address: string) {
        return this.request(`/api/users/${address}`);
    }

    // Allocation endpoints
    static async saveAllocation(data: {
        walletAddress: string;
        ecosystem: string;
        assetId: string;
        assetSymbol: string;
        amount: number;
        strategyLayers: any[];
    }) {
        return this.request('/api/allocations', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    static async getUserAllocations(address: string, ecosystem?: string) {
        const query = ecosystem ? `?ecosystem=${ecosystem}` : '';
        return this.request(`/api/allocations/${address}${query}`);
    }

    static async deleteAllocation(address: string, assetId: string) {
        return this.request(`/api/allocations/${address}/${assetId}`, {
            method: 'DELETE',
        });
    }

    // Rebalance endpoints
    static async simulateRebalance(data: {
        walletAddress: string;
        allocationId: number;
        currentSentiment: any;
    }) {
        return this.request('/api/rebalance/simulate', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    static async getRebalanceHistory(address: string, limit = 50, offset = 0) {
        return this.request(
            `/api/rebalance/history/${address}?limit=${limit}&offset=${offset}`
        );
    }

    // Wallet balance endpoints
    static async getWalletBalances(address: string, chainId: number = 1) {
        return this.request(`/api/wallet/balances/${address}?chainId=${chainId}`);
    }

    static async refreshWalletBalances(address: string, chainId?: number) {
        const query = chainId ? `?chainId=${chainId}` : '';
        return this.request(`/api/wallet/refresh/${address}${query}`, {
            method: 'POST',
        });
    }

    static async getSupportedTokens(chainId: number) {
        return this.request(`/api/wallet/tokens/${chainId}`);
    }

    static async getSupportedChains() {
        return this.request('/api/wallet/chains');
    }

    static async getTokenPrices(coingeckoIds: string[]) {
        const idsParam = coingeckoIds.join(',');
        return this.request(`/api/wallet/prices?ids=${idsParam}`);
    }

    // Vault endpoints
    static async createDeposit(data: {
        walletAddress: string;
        assetAddress: string;
        assetSymbol: string;
        amount: string;
        amountUsd?: number;
        txHash?: string;
    }) {
        return this.request('/api/vault/deposits', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    static async getDepositHistory(address: string, limit = 50, offset = 0) {
        return this.request(`/api/vault/deposits/${address}?limit=${limit}&offset=${offset}`);
    }

    static async createWithdrawal(data: {
        walletAddress: string;
        assetAddress: string;
        assetSymbol: string;
        amount: string;
        amountUsd?: number;
        txHash?: string;
    }) {
        return this.request('/api/vault/withdrawals', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    static async getWithdrawalHistory(address: string, limit = 50, offset = 0) {
        return this.request(`/api/vault/withdrawals/${address}?limit=${limit}&offset=${offset}`);
    }

    static async recordApproval(data: {
        walletAddress: string;
        tokenAddress: string;
        spenderAddress: string;
        approvedAmount: string;
        txHash?: string;
    }) {
        return this.request('/api/vault/approvals', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    static async getApprovals(address: string) {
        return this.request(`/api/vault/approvals/${address}`);
    }
}
