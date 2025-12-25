const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
}
