import Parser from 'rss-parser';
import axios from 'axios';
import { logger } from '../middleware/logger.js';

interface NewsItem {
    title: string;
    source: string;
    pubDate: string;
    link: string;
}

export interface RedditPost {
    title: string;
    score: number;
    numComments: number;
    url: string;
}

interface MarketData {
    fearGreedIndex: {
        value: number;
        classification: string;
    } | null;
    news: NewsItem[];
    trendingCoins: string[];
    redditSentiment: RedditPost[];
}

export class NewsService {
    private parser: Parser;
    private readonly RSS_FEEDS = [
        'https://cointelegraph.com/rss',
        'https://cryptopotato.com/feed/',
        'https://decrypt.co/feed'
    ];
    private readonly SUBREDDITS = ['CryptoCurrency', 'Bitcoin', 'DeFi'];

    constructor() {
        this.parser = new Parser();
    }

    /**
     * Aggregates data from all sources
     */
    async getAggregatedData(): Promise<MarketData> {
        try {
            const [fearGreed, news, trending, reddit] = await Promise.all([
                this.getFearAndGreedIndex(),
                this.getLatestNews(),
                this.getTrendingCoins(),
                this.getRedditSentiment(),
            ]);

            return {
                fearGreedIndex: fearGreed,
                news: news.slice(0, 15), // Top 15 headlines
                trendingCoins: trending,
                redditSentiment: reddit,
            };
        } catch (error) {
            logger.error('Error aggregating market data:', error);
            throw error;
        }
    }

    /**
     * Formats the data into a string prompt for the AI
     * (Simplified for AI prompt - we just send titles)
     */
    formatForPrompt(data: MarketData): string {
        const newsList = data.news
            .map((n, i) => `${i + 1}. [${n.source}] ${n.title}`)
            .join('\n');

        const redditList = data.redditSentiment
            .slice(0, 5) // Top 5 posts for prompt
            .map(p => `- ${p.title} (Score: ${p.score})`)
            .join('\n');

        const fearGreedStr = data.fearGreedIndex
            ? `Value: ${data.fearGreedIndex.value}/100 (${data.fearGreedIndex.classification})`
            : 'Unavailable';

        return `
MARKET DATA REPORT
------------------
1. FEAR & GREED INDEX:
${fearGreedStr}

2. TOP REDDIT DISCUSSIONS:
${redditList}

3. TOP TRENDING COINS:
${data.trendingCoins.join(', ')}

4. LATEST NEWS HEADLINES:
${newsList}
`;
    }

    private async getFearAndGreedIndex() {
        try {
            const response = await axios.get('https://api.alternative.me/fng/?limit=1');
            const data = response.data.data[0];
            return {
                value: parseInt(data.value),
                classification: data.value_classification
            };
        } catch (error) {
            logger.error('Failed to fetch Fear & Greed Index:', error);
            return null;
        }
    }

    private async getLatestNews(): Promise<NewsItem[]> {
        const allNews: NewsItem[] = [];

        // Fetch from ALL sources in parallel
        const feedPromises = this.RSS_FEEDS.map(async (feedUrl) => {
            try {
                const feed = await this.parser.parseURL(feedUrl);
                return feed.items.map(item => ({
                    title: item.title || '',
                    source: feed.title || 'Unknown Source',
                    pubDate: item.pubDate || new Date().toISOString(),
                    link: item.link || ''
                })).filter(item => item.title && item.link);
            } catch (error) {
                logger.warn(`Failed to fetch RSS feed ${feedUrl}: ${error}`);
                return [];
            }
        });

        const results = await Promise.all(feedPromises);
        results.forEach(items => allNews.push(...items));

        // Sort by date (newest first) and Deduplicate by title
        const uniqueNews = Array.from(new Map(allNews.map(item => [item.title, item])).values());

        return uniqueNews.sort((a, b) =>
            new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
        );
    }

    /**
     * Get top posts from crypto subreddits
     */
    private async getRedditSentiment(): Promise<RedditPost[]> {
        const allPosts: RedditPost[] = [];

        const subPromises = this.SUBREDDITS.map(async (sub) => {
            try {
                // Fetch top posts from last 24h
                const response = await axios.get(
                    `https://www.reddit.com/r/${sub}/top.json?t=day&limit=5`,
                    {
                        headers: { 'User-Agent': 'QuantumMatrix/1.0' } // Reddit requires a User-Agent
                    }
                );

                const posts = response.data.data.children.map((child: any) => ({
                    title: child.data.title,
                    score: child.data.score,
                    numComments: child.data.num_comments,
                    url: child.data.url
                }));

                return posts;
            } catch (error) {
                logger.warn(`Failed to fetch subreddit ${sub}: ${error}`);
                return [];
            }
        });

        const results = await Promise.all(subPromises);
        results.forEach(items => allPosts.push(...items));

        // Return top 15 posts sorted by score
        return allPosts.sort((a, b) => b.score - a.score).slice(0, 15);
    }

    /**
     * Get current ETH price
     */
    async getEthPrice(): Promise<number> {
        try {
            const response = await axios.get(
                'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
            );
            return response.data.ethereum.usd;
        } catch (error) {
            logger.warn('Failed to fetch ETH price, using fallback');
            return 3000; // Fallback
        }
    }

    private async getTrendingCoins(): Promise<string[]> {
        try {
            // CoinGecko Search Trending
            const response = await axios.get('https://api.coingecko.com/api/v3/search/trending');
            return response.data.coins.map((c: any) => c.item.symbol);
        } catch (error) {
            logger.warn('Failed to fetch trending coins, using fallback');
            return ['BTC', 'ETH', 'SOL', 'AI', 'RWA'];
        }
    }
}

export const newsService = new NewsService();