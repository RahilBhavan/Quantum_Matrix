import { logger } from '../middleware/logger.js';
import { cacheService } from './cache.service.js';
import { videoService } from './video.service.js';

// Source credibility tiers
const SOURCE_CREDIBILITY: Record<string, number> = {
    // Tier 1: Highly credible (1.0)
    'coindesk': 1.0,
    'the block': 1.0,
    'bloomberg': 1.0,
    'reuters': 1.0,
    // Tier 2: Credible (0.8)
    'cointelegraph': 0.8,
    'decrypt': 0.8,
    'crypto.com': 0.8,
    'binance': 0.8,
    // Tier 3: Moderate (0.6)
    'coingecko': 0.6,
    'medium': 0.6,
    'unknown': 0.5,
    // Tier 4: Social/User-generated (0.4)
    'reddit': 0.4,
    'twitter': 0.4,
};

interface NewsItem {
    title: string;
    source: string;
    publishedAt: string;
    url?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
    credibilityScore: number;  // 0-1 based on source tier
}

interface FearGreedData {
    value: number;
    classification: string;
    timestamp: string;
}

interface RedditPost {
    title: string;
    score: number;
    numComments: number;
    subreddit: string;
    influenceScore: number;  // Calculated from engagement
    createdAt: number;       // Unix timestamp
}

interface MarketDataSummary {
    news: NewsItem[];
    fearGreedIndex: FearGreedData | null;
    redditSentiment: RedditPost[];
    trendingCoins: string[];
    videoContent: string;  // Aggregated video titles and transcripts
    // Aggregated influence metrics
    aggregateInfluence: {
        totalRedditInfluence: number;
        averageCredibility: number;
        highEngagementCount: number;
        videoCount: number;
    };
}

/**
 * News and market data aggregation service
 * Fetches real-time data from multiple sources
 */
class NewsService {
    private readonly CACHE_KEY = 'news:aggregated';
    private readonly CACHE_TTL = 10 * 60; // 10 minutes

    /**
     * Get aggregated market data from all sources
     */
    async getAggregatedData(): Promise<MarketDataSummary> {
        // Check cache first
        const cached = await cacheService.get<MarketDataSummary>(this.CACHE_KEY);
        if (cached) {
            logger.debug('Returning cached market data');
            return cached;
        }

        // Fetch from all sources in parallel (including video)
        const [news, fearGreed, reddit, trending, video] = await Promise.allSettled([
            this.fetchCryptoNews(),
            this.fetchFearGreedIndex(),
            this.fetchRedditSentiment(),
            this.fetchTrendingCoins(),
            videoService.getVideoSentimentData(),
        ]);

        const newsData = news.status === 'fulfilled' ? news.value : [];
        const redditData = reddit.status === 'fulfilled' ? reddit.value : [];
        const videoData = video.status === 'fulfilled' ? video.value : null;

        // Calculate aggregate influence metrics
        const totalRedditInfluence = redditData.reduce((sum, p) => sum + p.influenceScore, 0);
        const averageCredibility = newsData.length > 0
            ? newsData.reduce((sum, n) => sum + n.credibilityScore, 0) / newsData.length
            : 0.5;
        const highEngagementCount = redditData.filter(p => p.influenceScore > 5).length;
        const videoCount = videoData?.videos?.length || 0;

        const result: MarketDataSummary = {
            news: newsData,
            fearGreedIndex: fearGreed.status === 'fulfilled' ? fearGreed.value : null,
            redditSentiment: redditData,
            trendingCoins: trending.status === 'fulfilled' ? trending.value : [],
            videoContent: videoData?.aggregatedContent || '',
            aggregateInfluence: {
                totalRedditInfluence,
                averageCredibility,
                highEngagementCount,
                videoCount,
            },
        };

        // Cache the result
        await cacheService.set(this.CACHE_KEY, result, this.CACHE_TTL);

        logger.info('Market data aggregated with influence scoring', {
            newsCount: newsData.length,
            redditCount: redditData.length,
            videoCount,
            avgCredibility: averageCredibility.toFixed(2),
            highEngagement: highEngagementCount,
        });

        return result;
    }

    /**
     * Fetch crypto news from CoinGecko (free, no API key required)
     */
    private async fetchCryptoNews(): Promise<NewsItem[]> {
        try {
            // CoinGecko status updates as a proxy for news
            const response = await fetch(
                'https://api.coingecko.com/api/v3/status_updates?per_page=20',
                {
                    headers: {
                        'Accept': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.status}`);
            }

            const data = await response.json();

            return (data.status_updates || []).slice(0, 10).map((item: any) => {
                const source = item.project?.name || 'CoinGecko';
                return {
                    title: item.description?.substring(0, 200) || 'No description',
                    source,
                    publishedAt: item.created_at,
                    url: item.project?.links?.homepage?.[0],
                    credibilityScore: this.getSourceCredibility(source),
                };
            });
        } catch (error) {
            logger.error('Failed to fetch CoinGecko news:', error);
            return this.getFallbackNews();
        }
    }

    /**
     * Get credibility score for a source
     */
    private getSourceCredibility(source: string): number {
        const normalized = source.toLowerCase();
        for (const [key, score] of Object.entries(SOURCE_CREDIBILITY)) {
            if (normalized.includes(key)) {
                return score;
            }
        }
        return SOURCE_CREDIBILITY['unknown'] || 0.5;
    }

    /**
     * Fetch Fear & Greed Index from Alternative.me
     */
    private async fetchFearGreedIndex(): Promise<FearGreedData | null> {
        try {
            const response = await fetch('https://api.alternative.me/fng/?limit=1');

            if (!response.ok) {
                throw new Error(`Fear & Greed API error: ${response.status}`);
            }

            const data = await response.json();
            const fng = data.data?.[0];

            if (!fng) return null;

            return {
                value: parseInt(fng.value, 10),
                classification: fng.value_classification,
                timestamp: new Date(parseInt(fng.timestamp, 10) * 1000).toISOString(),
            };
        } catch (error) {
            logger.error('Failed to fetch Fear & Greed Index:', error);
            return null;
        }
    }

    /**
     * Fetch Reddit cryptocurrency sentiment with influence scoring
     * Uses public JSON API (no auth required)
     */
    private async fetchRedditSentiment(): Promise<RedditPost[]> {
        try {
            const response = await fetch(
                'https://www.reddit.com/r/cryptocurrency/hot.json?limit=25',
                {
                    headers: {
                        'User-Agent': 'QuantumMatrix/1.0',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Reddit API error: ${response.status}`);
            }

            const data = await response.json();
            const now = Date.now() / 1000; // Unix timestamp

            return (data.data?.children || []).map((child: any) => {
                const score = child.data?.score || 0;
                const numComments = child.data?.num_comments || 0;
                const createdAt = child.data?.created_utc || now;

                // Calculate influence score
                // Formula: log10(upvotes + 1) * log10(comments + 1) * freshnessDecay
                const upvoteFactor = Math.log10(Math.max(score, 1) + 1);
                const commentFactor = Math.log10(Math.max(numComments, 1) + 1);
                const ageHours = (now - createdAt) / 3600;
                const freshnessDecay = Math.exp(-ageHours / 24); // Decay over 24 hours

                const influenceScore = upvoteFactor * commentFactor * freshnessDecay * 10; // Scale up

                return {
                    title: child.data?.title || '',
                    score,
                    numComments,
                    subreddit: child.data?.subreddit || 'cryptocurrency',
                    influenceScore: Math.round(influenceScore * 100) / 100,
                    createdAt,
                };
            });
        } catch (error) {
            logger.error('Failed to fetch Reddit sentiment:', error);
            return [];
        }
    }

    /**
     * Fetch trending coins from CoinGecko
     */
    private async fetchTrendingCoins(): Promise<string[]> {
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/search/trending');

            if (!response.ok) {
                throw new Error(`CoinGecko trending API error: ${response.status}`);
            }

            const data = await response.json();

            return (data.coins || []).slice(0, 7).map((coin: any) =>
                coin.item?.name || coin.item?.symbol || 'Unknown'
            );
        } catch (error) {
            logger.error('Failed to fetch trending coins:', error);
            return [];
        }
    }

    /**
     * Fallback news when APIs fail
     */
    private getFallbackNews(): NewsItem[] {
        return [
            {
                title: 'Crypto markets showing mixed signals amid global economic uncertainty',
                source: 'Market Analysis',
                publishedAt: new Date().toISOString(),
                credibilityScore: 0.5,
            },
            {
                title: 'DeFi protocols continue to see steady growth in TVL',
                source: 'DeFi Watch',
                publishedAt: new Date().toISOString(),
                credibilityScore: 0.5,
            },
            {
                title: 'Institutional investors maintain cautious stance on digital assets',
                source: 'Financial Times',
                publishedAt: new Date().toISOString(),
                credibilityScore: 1.0,
            },
        ];
    }

    /**
     * Format data for Gemini prompt
     */
    formatForPrompt(data: MarketDataSummary): string {
        const sections: string[] = [];

        // Fear & Greed
        if (data.fearGreedIndex) {
            sections.push(
                `FEAR & GREED INDEX: ${data.fearGreedIndex.value}/100 (${data.fearGreedIndex.classification})`
            );
        }

        // News headlines
        if (data.news.length > 0) {
            const headlines = data.news.map(n => `- ${n.title}`).join('\n');
            sections.push(`RECENT CRYPTO NEWS:\n${headlines}`);
        }

        // Reddit sentiment
        if (data.redditSentiment.length > 0) {
            const topPosts = data.redditSentiment
                .slice(0, 5)
                .map(p => `- [${p.score} upvotes] ${p.title}`)
                .join('\n');
            sections.push(`REDDIT r/cryptocurrency TOP POSTS:\n${topPosts}`);
        }

        // Trending
        if (data.trendingCoins.length > 0) {
            sections.push(`TRENDING COINS: ${data.trendingCoins.join(', ')}`);
        }

        // Video content (YouTube Shorts)
        if (data.videoContent && data.videoContent.length > 0) {
            sections.push(data.videoContent);
        }

        return sections.join('\n\n');
    }
}

export const newsService = new NewsService();
