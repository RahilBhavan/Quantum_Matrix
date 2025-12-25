import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../config/env.js';
import { cacheService } from './cache.service.js';
import { logger } from '../middleware/logger.js';
import { CacheKeys, CacheTTL } from '../utils/cache.js';
import type { MarketSentiment, AiRecommendation, StrategyLayer } from '../types/index.js';

export class GeminiService {
    private ai: GoogleGenAI | null = null;
    private requestCount = 0;
    private readonly MAX_RETRIES = 3;

    constructor() {
        if (config.gemini.apiKey) {
            this.ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });
            logger.info('Gemini AI initialized');
        } else {
            logger.warn('Gemini API key not provided, using fallback mode');
        }
    }

    /**
     * Analyze market sentiment from news headlines
     */
    async analyzeSentiment(news: string[]): Promise<MarketSentiment> {
        const cacheKey = CacheKeys.sentiment();

        // Try cache first
        const cached = await cacheService.get<MarketSentiment>(cacheKey);
        if (cached) {
            logger.info('Sentiment served from cache');
            return cached;
        }

        // If no API key, return fallback
        if (!this.ai) {
            return this.getFallbackSentiment();
        }

        // Retry logic with exponential backoff
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                const result = await this.callSentimentAPI(news);

                // Cache successful result
                await cacheService.set(cacheKey, result, CacheTTL.sentiment);

                logger.info(`Sentiment analysis successful (attempt ${attempt})`, {
                    score: result.score,
                    label: result.label,
                });

                this.requestCount++;
                return result;
            } catch (error) {
                logger.error(`Gemini API error (attempt ${attempt}):`, error);

                if (attempt === this.MAX_RETRIES) {
                    // Return fallback on final failure
                    return this.getFallbackSentiment();
                }

                // Exponential backoff: 1s, 2s, 4s
                await this.sleep(Math.pow(2, attempt - 1) * 1000);
            }
        }

        return this.getFallbackSentiment();
    }

    /**
     * Get portfolio recommendation based on sentiment
     */
    async getPortfolioRecommendation(
        sentiment: MarketSentiment,
        ecosystem: string,
        assets: Array<{ id: string; symbol: string }>,
        strategies: Array<{ id: string; name: string; risk: string; type: string }>
    ): Promise<AiRecommendation> {
        const cacheKey = CacheKeys.aiRecommendation('global', ecosystem);

        // Try cache first
        const cached = await cacheService.get<AiRecommendation>(cacheKey);
        if (cached) {
            logger.info('AI recommendation served from cache');
            return cached;
        }

        // If no API key, return fallback
        if (!this.ai) {
            return this.getFallbackRecommendation(assets, strategies);
        }

        // Retry logic
        for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                const result = await this.callRecommendationAPI(
                    sentiment,
                    ecosystem,
                    assets,
                    strategies
                );

                // Cache successful result
                await cacheService.set(cacheKey, result, CacheTTL.aiRecommendation);

                logger.info(`Portfolio recommendation successful (attempt ${attempt})`);

                this.requestCount++;
                return result;
            } catch (error) {
                logger.error(`Gemini recommendation error (attempt ${attempt}):`, error);

                if (attempt === this.MAX_RETRIES) {
                    return this.getFallbackRecommendation(assets, strategies);
                }

                await this.sleep(Math.pow(2, attempt - 1) * 1000);
            }
        }

        return this.getFallbackRecommendation(assets, strategies);
    }

    /**
     * Call Gemini API for sentiment analysis
     */
    private async callSentimentAPI(news: string[]): Promise<MarketSentiment> {
        if (!this.ai) throw new Error('Gemini AI not initialized');

        const response = await this.ai.models.generateContent({
            model: config.gemini.model,
            contents: `Analyze the following crypto market news headlines and determine the market sentiment.
      
      Headlines:
      ${news.join('\n')}
      
      Return a JSON object with:
      - score: number 0-100 (0 is extreme fear, 100 is extreme greed)
      - label: one of 'Bearish', 'Neutral', 'Bullish', 'Euphoric'
      - summary: a short 1 sentence summary
      - trendingTopics: array of strings (max 5 topics)`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.INTEGER },
                        label: { type: Type.STRING },
                        summary: { type: Type.STRING },
                        trendingTopics: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                },
            },
        });

        const text = response.text;
        if (!text) throw new Error('No response from AI');

        return JSON.parse(text) as MarketSentiment;
    }

    /**
     * Call Gemini API for portfolio recommendation
     */
    private async callRecommendationAPI(
        sentiment: MarketSentiment,
        ecosystem: string,
        assets: Array<{ id: string; symbol: string }>,
        strategies: Array<{ id: string; name: string; risk: string; type: string }>
    ): Promise<AiRecommendation> {
        if (!this.ai) throw new Error('Gemini AI not initialized');

        const prompt = `
      Act as a DeFi Quantitative Portfolio Manager.
      
      Current Market Sentiment: ${sentiment.label} (Score: ${sentiment.score}/100)
      Summary: ${sentiment.summary}
      
      Selected Ecosystem: ${ecosystem}
      Assets to Allocate:
      ${JSON.stringify(assets)}
      
      Available Quant Strategies:
      ${JSON.stringify(strategies)}
      
      Task: Create a "Strategy Stack" for each asset.
      - A Strategy Stack consists of multiple strategies triggered by different market conditions.
      - Conditions include: 'Always', 'Bullish', 'Bearish', 'Neutral', 'Euphoric', 'High Volatility', 'AI Adaptive'.
      - 'AI Adaptive' means the strategy activates only when its risk profile matches the AI sentiment.
      - Include a 'weight' (0-100) for each strategy.
      - For example: 50% Yield (Always) + 50% Momentum (Bullish).
      
      Return JSON with allocations for each asset and reasoning.
    `;

        const response = await this.ai.models.generateContent({
            model: config.gemini.model,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        allocations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    assetId: { type: Type.STRING },
                                    layers: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                strategyId: { type: Type.STRING },
                                                condition: {
                                                    type: Type.STRING,
                                                    enum: [
                                                        'Always',
                                                        'Bullish',
                                                        'Bearish',
                                                        'Neutral',
                                                        'Euphoric',
                                                        'High Volatility',
                                                        'AI Adaptive',
                                                    ],
                                                },
                                                weight: { type: Type.INTEGER },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        reasoning: { type: Type.STRING },
                    },
                },
            },
        });

        const text = response.text;
        if (!text) throw new Error('No response from AI');

        return JSON.parse(text) as AiRecommendation;
    }

    /**
     * Fallback sentiment when API fails
     */
    private getFallbackSentiment(): MarketSentiment {
        return {
            score: 50,
            label: 'Neutral',
            summary: 'Could not analyze sentiment at this time. Using neutral baseline.',
            trendingTopics: [],
            confidence: 0,
        };
    }

    /**
     * Fallback recommendation when API fails
     */
    private getFallbackRecommendation(
        assets: Array<{ id: string; symbol: string }>,
        strategies: Array<{ id: string; name: string; risk: string; type: string }>
    ): AiRecommendation {
        const yieldStrategy = strategies.find((s) => s.type === 'Yield');
        const momentumStrategy = strategies.find((s) => s.type === 'Momentum');

        return {
            allocations: assets.map((a) => ({
                assetId: a.id,
                layers: [
                    {
                        strategyId: yieldStrategy?.id || strategies[0].id,
                        condition: 'Always',
                        weight: 50,
                    },
                    {
                        strategyId: momentumStrategy?.id || strategies[1]?.id || strategies[0].id,
                        condition: 'Bullish',
                        weight: 50,
                    },
                ],
            })),
            reasoning:
                'Fallback: Balanced allocation with 50% stable yield and 50% momentum for upside capture.',
        };
    }

    /**
     * Sleep utility for retry backoff
     */
    private async sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Get request count (for monitoring)
     */
    getRequestCount(): number {
        return this.requestCount;
    }

    /**
     * Reset request count
     */
    resetRequestCount(): void {
        this.requestCount = 0;
    }
}

export const geminiService = new GeminiService();
