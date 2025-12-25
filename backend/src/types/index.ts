// Strategy condition types
export type StrategyCondition =
    | 'Always'
    | 'Bullish'
    | 'Bearish'
    | 'Neutral'
    | 'Euphoric'
    | 'High Volatility'
    | 'AI Adaptive';

// Risk levels
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Degen';

// Strategy types
export type StrategyType = 'Quant' | 'Delta Neutral' | 'Momentum' | 'Leverage' | 'Yield';

// Market sentiment
export interface MarketSentiment {
    score: number;
    label: 'Bearish' | 'Neutral' | 'Bullish' | 'Euphoric';
    summary: string;
    trendingTopics: string[];
    confidence?: number;
}

// Strategy layer
export interface StrategyLayer {
    strategyId: string;
    condition: StrategyCondition;
    weight: number;
}

// User allocation
export interface UserAllocation {
    id: number;
    userId: number;
    ecosystem: string;
    assetId: string;
    assetSymbol: string;
    strategyLayers: StrategyLayer[];
    amount: number;
    createdAt: Date;
    updatedAt: Date;
}

// Rebalance history
export interface RebalanceHistory {
    id: number;
    userId: number;
    allocationId: number | null;
    ecosystem: string;
    assetId: string;
    triggerType: string;
    sentimentScore: number | null;
    sentimentLabel: string | null;
    gasCostUsd: number | null;
    profitUsd: number | null;
    txHash: string | null;
    status: 'pending' | 'success' | 'failed';
    errorMessage: string | null;
    executedAt: Date;
}

// User
export interface User {
    id: number;
    walletAddress: string;
    createdAt: Date;
    updatedAt: Date;
    totalTvl: number;
    lastRebalanceAt: Date | null;
    preferences: Record<string, any>;
}

// AI Recommendation
export interface AiRecommendation {
    allocations: Array<{
        assetId: string;
        layers: StrategyLayer[];
    }>;
    reasoning: string;
}

// API Response types
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Pagination
export interface PaginationParams {
    limit: number;
    offset: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    limit: number;
    offset: number;
}
