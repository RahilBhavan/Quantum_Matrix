import { logger } from '../middleware/logger.js';
import { cacheService } from './cache.service.js';
import { newsService } from './news.service.js';
import { geminiService } from './gemini.service.js';

/**
 * S³ - Sentiment Synthesis Score
 * 
 * A confidence-adjusted weighted average combining:
 * - S_lex: Lexicon-based (VADER-style from Fear & Greed)
 * - S_ml: Traditional ML baseline
 * - S_dl: Deep Learning temporal patterns
 * - S_trans: Transformer contextual understanding (Gemini)
 * 
 * Formula: S³ = (w_lex * S_lex + w_ml * S_ml + w_dl * S_dl + w_trans * S_trans) * C_score
 */

interface S3Components {
    S_lex: number;      // Lexicon score (-1 to +1)
    S_ml: number;       // ML baseline (-1 to +1)
    S_dl: number;       // Deep learning (-1 to +1)
    S_trans: number;    // Transformer (-1 to +1)
}

interface S3Weights {
    w_lex: number;
    w_ml: number;
    w_dl: number;
    w_trans: number;
}

interface S3Result {
    score: number;              // Final S³ score (-1 to +1)
    normalizedScore: number;    // 0-100 scale for UI
    label: 'Bearish' | 'Neutral' | 'Bullish' | 'Euphoric';
    confidence: number;         // C_score (0 to 1)
    components: S3Components;
    weights: S3Weights;
    disagreementResolved: boolean;
    resolution?: {
        source: string;
        signal: 'bullish' | 'bearish' | 'neutral';
        nudge: number;
    };
    summary: string;
    trendingTopics: string[];
}

interface AnalysisContext {
    dataSource: 'social_media' | 'news' | 'mixed';
    timeHorizon: 'short' | 'medium' | 'long';
    assetMaturity: 'new' | 'established';
    volatilityRegime: 'low' | 'normal' | 'high';
}

const DISAGREEMENT_THRESHOLD = 0.6; // C_score below this triggers resolution
const NUDGE_FACTOR = 0.1;           // Adjustment when resolving disagreement

class S3SentimentService {
    private readonly CACHE_KEY = 's3:sentiment';
    private readonly CACHE_TTL = 15 * 60; // 15 minutes

    /**
     * Calculate the full S³ Sentiment Synthesis Score
     */
    async calculateS3Score(context?: Partial<AnalysisContext>): Promise<S3Result> {
        // Check cache first
        const cached = await cacheService.get<S3Result>(this.CACHE_KEY);
        if (cached) {
            logger.info('S³ score served from cache');
            return cached;
        }

        // Fetch real market data
        const marketData = await newsService.getAggregatedData();

        // Get component scores
        const components = await this.getComponentScores(marketData);

        // Determine dynamic weights based on context
        const effectiveContext = this.getEffectiveContext(context, marketData);
        const weights = this.getDynamicWeights(effectiveContext);

        // Calculate confidence score from model agreement
        const confidence = this.calculateConfidence(components);

        // Calculate initial raw weighted score
        let rawScore = this.calculateWeightedScore(components, weights);

        // Check for disagreement and apply resolution if needed
        let disagreementResolved = false;
        let resolution: S3Result['resolution'];

        if (confidence < DISAGREEMENT_THRESHOLD) {
            const resolutionResult = await this.resolveDisagreement(rawScore, marketData);
            rawScore = resolutionResult.adjustedScore;
            disagreementResolved = true;
            resolution = resolutionResult.resolution;
        }

        // Apply confidence multiplier to final score
        const finalScore = rawScore * confidence;

        // Build result
        const result: S3Result = {
            score: Math.round(finalScore * 1000) / 1000,
            normalizedScore: this.toNormalizedScale(finalScore),
            label: this.scoreToLabel(finalScore),
            confidence: Math.round(confidence * 100) / 100,
            components,
            weights,
            disagreementResolved,
            resolution,
            summary: this.generateSummary(finalScore, confidence, marketData),
            trendingTopics: marketData.trendingCoins.slice(0, 5),
        };

        // Cache result
        await cacheService.set(this.CACHE_KEY, result, this.CACHE_TTL);

        logger.info('S³ score calculated', {
            score: result.score,
            normalizedScore: result.normalizedScore,
            label: result.label,
            confidence: result.confidence,
        });

        return result;
    }

    /**
     * Get component scores from different model families
     */
    private async getComponentScores(marketData: Awaited<ReturnType<typeof newsService.getAggregatedData>>): Promise<S3Components> {
        // S_lex: Lexicon-based score from Fear & Greed Index
        // Normalize Fear & Greed (0-100) to (-1 to +1)
        const fearGreedValue = marketData.fearGreedIndex?.value ?? 50;
        const S_lex = (fearGreedValue - 50) / 50;

        // S_ml: ML baseline from Reddit sentiment heuristic
        // Calculate based on upvote ratios and comment engagement
        const S_ml = this.calculateRedditSentiment(marketData.redditSentiment);

        // S_dl: Deep learning temporal pattern (simulated with trend analysis)
        // Use Fear & Greed trend direction as proxy
        const S_dl = this.calculateTrendSentiment(marketData.news);

        // S_trans: Transformer score from Gemini
        let S_trans = 0;
        try {
            const geminiResult = await geminiService.analyzeRealTimeSentiment();
            // Normalize Gemini score (0-100) to (-1 to +1)
            S_trans = (geminiResult.score - 50) / 50;
        } catch (error) {
            logger.warn('Failed to get Gemini sentiment, using fallback');
            S_trans = S_lex * 0.9; // Fallback to lexicon with slight dampening
        }

        return {
            S_lex: this.clamp(S_lex, -1, 1),
            S_ml: this.clamp(S_ml, -1, 1),
            S_dl: this.clamp(S_dl, -1, 1),
            S_trans: this.clamp(S_trans, -1, 1),
        };
    }

    /**
     * Calculate Reddit-based sentiment score with INFLUENCE WEIGHTING
     * High engagement posts have more weight
     */
    private calculateRedditSentiment(posts: Array<{ title: string; score: number; numComments: number; influenceScore?: number }>): number {
        if (posts.length === 0) return 0;

        // Sentiment keywords with intensity weights
        const bullishKeywords: Record<string, number> = {
            'moon': 1.0, 'pump': 0.8, 'bullish': 1.0, 'ath': 1.2, 'buy': 0.6,
            'long': 0.7, 'breakout': 0.9, 'rally': 1.0, 'soaring': 1.1, 'btfd': 0.8,
            'hodl': 0.5, 'accumulate': 0.7, 'undervalued': 0.8, 'adoption': 0.9,
        };
        const bearishKeywords: Record<string, number> = {
            'crash': 1.2, 'dump': 1.0, 'bearish': 1.0, 'dead': 0.9, 'sell': 0.6,
            'short': 0.7, 'collapse': 1.1, 'scam': 1.0, 'rug': 1.2, 'ponzi': 1.1,
            'plunge': 1.0, 'tank': 0.9, 'bubble': 0.8, 'warning': 0.7,
        };

        let weightedBullish = 0;
        let weightedBearish = 0;
        let totalInfluence = 0;

        for (const post of posts) {
            const title = post.title.toLowerCase();

            // Use influence score if available, otherwise calculate from engagement
            const influence = post.influenceScore ??
                (Math.log10(post.score + 1) * Math.log10(post.numComments + 1));

            // Calculate sentiment for this post
            let postBullish = 0;
            let postBearish = 0;

            for (const [keyword, intensity] of Object.entries(bullishKeywords)) {
                if (title.includes(keyword)) postBullish += intensity;
            }
            for (const [keyword, intensity] of Object.entries(bearishKeywords)) {
                if (title.includes(keyword)) postBearish += intensity;
            }

            // Weight by influence - high engagement posts matter more
            weightedBullish += postBullish * influence;
            weightedBearish += postBearish * influence;
            totalInfluence += influence;
        }

        if (totalInfluence === 0) return 0;

        // Normalize to -1 to +1
        const rawSentiment = (weightedBullish - weightedBearish) / totalInfluence;
        return this.clamp(rawSentiment, -1, 1);
    }

    /**
     * Calculate trend-based sentiment (DL proxy) with CREDIBILITY WEIGHTING
     */
    private calculateTrendSentiment(news: Array<{ title: string; credibilityScore?: number }>): number {
        if (news.length === 0) return 0;

        // Sentiment keywords with intensity
        const positiveWords: Record<string, number> = {
            'surge': 1.0, 'rally': 0.9, 'growth': 0.7, 'adoption': 0.8, 'bullish': 1.0,
            'record': 0.9, 'breakthrough': 1.0, 'success': 0.7, 'milestone': 0.8,
            'partnership': 0.6, 'upgrade': 0.7, 'launch': 0.5, 'approval': 0.9,
        };
        const negativeWords: Record<string, number> = {
            'crash': 1.2, 'fall': 0.8, 'decline': 0.7, 'bearish': 1.0, 'loss': 0.8,
            'hack': 1.1, 'failure': 0.9, 'ban': 1.0, 'lawsuit': 0.9, 'investigation': 0.8,
            'fraud': 1.1, 'warning': 0.7, 'risk': 0.5, 'concern': 0.6,
        };

        let weightedPositive = 0;
        let weightedNegative = 0;
        let totalCredibility = 0;

        for (const item of news) {
            const title = item.title.toLowerCase();
            const credibility = item.credibilityScore ?? 0.5;

            let itemPositive = 0;
            let itemNegative = 0;

            for (const [word, intensity] of Object.entries(positiveWords)) {
                if (title.includes(word)) itemPositive += intensity;
            }
            for (const [word, intensity] of Object.entries(negativeWords)) {
                if (title.includes(word)) itemNegative += intensity;
            }

            // Weight by credibility - trusted sources matter more
            weightedPositive += itemPositive * credibility;
            weightedNegative += itemNegative * credibility;
            totalCredibility += credibility;
        }

        if (totalCredibility === 0) return 0;

        // Normalize to -1 to +1
        const rawSentiment = (weightedPositive - weightedNegative) / totalCredibility;
        return this.clamp(rawSentiment * 2, -1, 1); // Scale up since keyword matches are sparse
    }

    /**
     * Determine effective analysis context
     */
    private getEffectiveContext(
        provided?: Partial<AnalysisContext>,
        marketData?: Awaited<ReturnType<typeof newsService.getAggregatedData>>
    ): AnalysisContext {
        return {
            dataSource: provided?.dataSource ?? 'mixed',
            timeHorizon: provided?.timeHorizon ?? 'short',
            assetMaturity: provided?.assetMaturity ?? 'established',
            volatilityRegime: provided?.volatilityRegime ?? 'normal',
        };
    }

    /**
     * Calculate dynamic weights based on context
     * Weights must sum to 1.0
     */
    private getDynamicWeights(context: AnalysisContext): S3Weights {
        // Default balanced weights
        let weights: S3Weights = {
            w_lex: 0.25,
            w_ml: 0.20,
            w_dl: 0.25,
            w_trans: 0.30,
        };

        // Adjust based on data source
        if (context.dataSource === 'social_media') {
            weights = { w_lex: 0.40, w_ml: 0.10, w_dl: 0.20, w_trans: 0.30 };
        } else if (context.dataSource === 'news') {
            weights = { w_lex: 0.15, w_ml: 0.15, w_dl: 0.25, w_trans: 0.45 };
        }

        // Adjust for time horizon
        if (context.timeHorizon === 'short') {
            weights.w_lex += 0.05;
            weights.w_trans -= 0.05;
        } else if (context.timeHorizon === 'long') {
            weights.w_trans += 0.05;
            weights.w_lex -= 0.05;
        }

        // Adjust for new assets
        if (context.assetMaturity === 'new') {
            weights.w_lex += 0.10;
            weights.w_ml -= 0.10;
        }

        // Normalize to ensure sum = 1
        const sum = weights.w_lex + weights.w_ml + weights.w_dl + weights.w_trans;
        return {
            w_lex: weights.w_lex / sum,
            w_ml: weights.w_ml / sum,
            w_dl: weights.w_dl / sum,
            w_trans: weights.w_trans / sum,
        };
    }

    /**
     * Calculate confidence score based on model agreement
     * Low standard deviation = high agreement = high confidence
     */
    private calculateConfidence(components: S3Components): number {
        const scores = [components.S_lex, components.S_ml, components.S_dl, components.S_trans];
        const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
        const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
        const stdDev = Math.sqrt(variance);

        // Convert std dev to confidence (lower std dev = higher confidence)
        // Max meaningful std dev is around 1.0 (full disagreement from -1 to +1)
        // We want: stdDev=0 -> C=1.0, stdDev=1.0 -> C=0.5
        const confidence = 1 - (stdDev * 0.5);

        return this.clamp(confidence, 0.5, 1.0);
    }

    /**
     * Calculate weighted score from components
     */
    private calculateWeightedScore(components: S3Components, weights: S3Weights): number {
        return (
            weights.w_lex * components.S_lex +
            weights.w_ml * components.S_ml +
            weights.w_dl * components.S_dl +
            weights.w_trans * components.S_trans
        );
    }

    /**
     * Resolve disagreement using external data
     */
    private async resolveDisagreement(
        rawScore: number,
        marketData: Awaited<ReturnType<typeof newsService.getAggregatedData>>
    ): Promise<{ adjustedScore: number; resolution: S3Result['resolution'] }> {
        // For now, use Fear & Greed trend as tie-breaker
        // In production, this would query SOPR and Put/Call ratio

        const fearGreed = marketData.fearGreedIndex;
        let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
        let nudge = 0;

        if (fearGreed) {
            if (fearGreed.value >= 55) {
                signal = 'bullish';
                nudge = NUDGE_FACTOR;
            } else if (fearGreed.value <= 45) {
                signal = 'bearish';
                nudge = -NUDGE_FACTOR;
            }
        }

        return {
            adjustedScore: rawScore + nudge,
            resolution: {
                source: 'Fear & Greed Index',
                signal,
                nudge,
            },
        };
    }

    /**
     * Convert S³ score (-1 to +1) to label
     */
    private scoreToLabel(score: number): 'Bearish' | 'Neutral' | 'Bullish' | 'Euphoric' {
        if (score <= -0.3) return 'Bearish';
        if (score <= 0.2) return 'Neutral';
        if (score <= 0.6) return 'Bullish';
        return 'Euphoric';
    }

    /**
     * Convert S³ score to 0-100 scale
     */
    private toNormalizedScale(score: number): number {
        return Math.round((score + 1) * 50);
    }

    /**
     * Generate human-readable summary
     */
    private generateSummary(
        score: number,
        confidence: number,
        marketData: Awaited<ReturnType<typeof newsService.getAggregatedData>>
    ): string {
        const label = this.scoreToLabel(score);
        const normalizedScore = this.toNormalizedScale(score);
        const confidencePercent = Math.round(confidence * 100);

        const fng = marketData.fearGreedIndex;
        const fngStr = fng ? ` Fear & Greed Index at ${fng.value} (${fng.classification}).` : '';

        return `Market sentiment is ${label.toLowerCase()} (S³: ${normalizedScore}/100) with ${confidencePercent}% confidence.${fngStr}`;
    }

    /**
     * Utility to clamp value between min and max
     */
    private clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value));
    }
}

export const s3SentimentService = new S3SentimentService();
