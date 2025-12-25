import { logger } from '../middleware/logger.js';
import { cacheService } from './cache.service.js';

interface NewsItem {
    title: string;
    source: string;
    publishedAt: string;
    url?: string;
    sentiment?: 'positive' | 'negative' | 'neutral';
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
}

interface MarketDataSummary {
    news: NewsItem[];
    fearGreedIndex: FearGreedData | null;
    redditSentiment: RedditPost[];
    trendingCoins: string[];
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

        // Fetch from all sources in parallel
        const [news, fearGreed, reddit, trending] = await Promise.allSettled([
            this.fetchCryptoNews(),
            this.fetchFearGreedIndex(),
            this.fetchRedditSentiment(),
            this.fetchTrendingCoins(),
        ]);

        const result: MarketDataSummary = {
            news: news.status === 'fulfilled' ? news.value : [],
            fearGreedIndex: fearGreed.status === 'fulfilled' ? fearGreed.value : null,
            redditSentiment: reddit.status === 'fulfilled' ? reddit.value : [],
            trendingCoins: trending.status === 'fulfilled' ? trending.value : [],
        };

        // Cache the result
        await cacheService.set(this.CACHE_KEY, result, this.CACHE_TTL);

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

            return (data.status_updates || []).slice(0, 10).map((item: any) => ({
                title: item.description?.substring(0, 200) || 'No description',
                source: item.project?.name || 'CoinGecko',
                publishedAt: item.created_at,
                url: item.project?.links?.homepage?.[0],
            }));
        } catch (error) {
            logger.error('Failed to fetch CoinGecko news:', error);
            return this.getFallbackNews();
        }
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
     * Fetch Reddit cryptocurrency sentiment
     * Uses public JSON API (no auth required)
     */
    private async fetchRedditSentiment(): Promise<RedditPost[]> {
        try {
            const response = await fetch(
                'https://www.reddit.com/r/cryptocurrency/hot.json?limit=15',
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

            return (data.data?.children || []).map((child: any) => ({
                title: child.data?.title || '',
                score: child.data?.score || 0,
                numComments: child.data?.num_comments || 0,
                subreddit: child.data?.subreddit || 'cryptocurrency',
            }));
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
            },
            {
                title: 'DeFi protocols continue to see steady growth in TVL',
                source: 'DeFi Watch',
                publishedAt: new Date().toISOString(),
            },
            {
                title: 'Institutional investors maintain cautious stance on digital assets',
                source: 'Financial Times',
                publishedAt: new Date().toISOString(),
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

        return sections.join('\n\n');
    }
}

export const newsService = new NewsService();
