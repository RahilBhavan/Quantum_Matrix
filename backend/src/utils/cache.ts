// Cache key generators
export const CacheKeys = {
    sentiment: () => 'sentiment:current',
    sentimentHistory: (days: number) => `sentiment:history:${days}d`,
    userAllocations: (address: string) => `allocations:${address.toLowerCase()}`,
    assetPrice: (symbol: string) => `price:${symbol.toUpperCase()}`,
    aiRecommendation: (address: string, ecosystem: string) =>
        `ai:recommendation:${address.toLowerCase()}:${ecosystem}`,
    userStats: (address: string) => `user:stats:${address.toLowerCase()}`,
    rebalanceHistory: (address: string, limit: number, offset: number) =>
        `rebalance:history:${address.toLowerCase()}:${limit}:${offset}`,
};

// TTL (Time To Live) in seconds
export const CacheTTL = {
    sentiment: 15 * 60,           // 15 minutes
    sentimentHistory: 60 * 60,    // 1 hour
    userAllocations: 5 * 60,      // 5 minutes
    assetPrice: 30,               // 30 seconds
    aiRecommendation: 5 * 60,     // 5 minutes
    userStats: 2 * 60,            // 2 minutes
    rebalanceHistory: 5 * 60,     // 5 minutes
};

// Helper to generate cache key with prefix
export const generateCacheKey = (prefix: string, ...parts: (string | number)[]) => {
    return `${prefix}:${parts.join(':')}`;
};
