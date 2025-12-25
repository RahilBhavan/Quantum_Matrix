import pool from '../../config/database.js';
import type { MarketSentiment } from '../types/index.js';

export class SentimentQueries {
    /**
     * Save sentiment to history
     */
    static async create(sentiment: MarketSentiment): Promise<void> {
        const query = `
      INSERT INTO sentiment_history (score, label, summary, trending_topics, confidence)
      VALUES ($1, $2, $3, $4, $5)
    `;

        await pool.query(query, [
            sentiment.score,
            sentiment.label,
            sentiment.summary,
            JSON.stringify(sentiment.trendingTopics),
            sentiment.confidence || null,
        ]);
    }

    /**
     * Get sentiment history for the last N days
     */
    static async getHistory(days: number = 7): Promise<MarketSentiment[]> {
        const query = `
      SELECT * FROM sentiment_history 
      WHERE recorded_at >= NOW() - INTERVAL '${days} days'
      ORDER BY recorded_at DESC
    `;

        const result = await pool.query(query);
        return result.rows.map(this.mapRow);
    }

    /**
     * Get latest sentiment from database
     */
    static async getLatest(): Promise<MarketSentiment | null> {
        const query = `
      SELECT * FROM sentiment_history 
      ORDER BY recorded_at DESC 
      LIMIT 1
    `;

        const result = await pool.query(query);
        if (result.rows.length === 0) return null;

        return this.mapRow(result.rows[0]);
    }

    /**
     * Map database row to MarketSentiment type
     */
    private static mapRow(row: any): MarketSentiment {
        return {
            score: row.score,
            label: row.label,
            summary: row.summary,
            trendingTopics: row.trending_topics,
            confidence: row.confidence ? parseFloat(row.confidence) : undefined,
        };
    }
}
