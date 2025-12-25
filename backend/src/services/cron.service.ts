import cron from 'node-cron';
import { logger } from '../middleware/logger.js';
import { geminiService } from './gemini.service.js';
import { newsService } from './news.service.js';
import { pool } from '../config/database.js';
import { rebalanceService } from './rebalance.service.js';
import { AllocationQueries } from '../db/queries/allocations.js';

export class CronService {
    start() {
        logger.info('⏰ Starting Cron Service...');

        // Task 1: Sentinel - Analyze Market (Every 30 minutes)
        // Runs at minute 0 and 30
        cron.schedule('0,30 * * * *', async () => {
            logger.info('🔄 Running Sentinel Job: Market Analysis');
            await this.runSentinel();
        });

        // Task 2: Feedback Loop - Evaluate Past Predictions (Every 4 hours)
        cron.schedule('0 */4 * * *', async () => {
            logger.info('🔄 Running Feedback Job: Evaluating Past Performance');
            await this.runFeedbackLoop();
        });

        // Run immediately on startup for testing
        this.runSentinel().catch(e => logger.error('Startup Sentinel failed', e));
    }

    private async runSentinel() {
        try {
            // 1. Get Real Data
            const ethPrice = await newsService.getEthPrice();

            // 2. Analyze
            const sentiment = await geminiService.analyzeRealTimeSentiment();

            // 3. Save to DB with Market Context
            await pool.query(
                `INSERT INTO sentiment_history 
                (score, label, summary, trending_topics, confidence, reasoning, market_price_eth) 
                VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                    sentiment.score,
                    sentiment.label,
                    sentiment.summary,
                    JSON.stringify(sentiment.trendingTopics),
                    sentiment.confidence || 0.5,
                    sentiment.reasoning || '',
                    ethPrice
                ]
            );

            logger.info(`✅ Sentinel Updated: ${sentiment.label} (${sentiment.score}) @ $${ethPrice}`);

            // 4. Trigger Automated Rebalancing (Paper Trading)
            // Fetch ALL active allocations
            // Note: In a large scale system, this would be batched or queued
            const allAllocations = await AllocationQueries.findAll();

            if (allAllocations.length > 0) {
                logger.info(`🤖 Starting Automations for ${allAllocations.length} allocations...`);

                let executedCount = 0;
                for (const allocation of allAllocations) {
                    try {
                        const result = await rebalanceService.executeRebalance(allocation, sentiment);
                        if (result.executed) executedCount++;
                    } catch (err) {
                        logger.error(`Failed to process allocation ${allocation.id}`, err);
                    }
                }

                if (executedCount > 0) {
                    logger.info(`🚀 Paper Trading: Executed ${executedCount} rebalance actions.`);
                }
            }

        } catch (error) {
            logger.error('❌ Sentinel Job Failed:', error);
        }
    }

    private async runFeedbackLoop() {
        try {
            const currentPrice = await newsService.getEthPrice();

            // Find records > 24h old that haven't been evaluated
            const result = await pool.query(
                `SELECT * FROM sentiment_history 
                WHERE actual_price_change_24h IS NULL 
                AND recorded_at < NOW() - INTERVAL '24 hours'
                LIMIT 50`
            );

            for (const row of result.rows) {
                const oldPrice = parseFloat(row.market_price_eth);
                if (!oldPrice) continue;

                // Calculate Change
                const percentChange = ((currentPrice - oldPrice) / oldPrice) * 100;

                // Determine "Truth" (Did the AI get it right?)
                // Bullish (>55) should see Positive Change
                // Bearish (<45) should see Negative Change
                // Neutral (45-55) should see Low Volatility (<1.5% change)
                let isCorrect = false;
                const score = row.score;

                if (score > 55 && percentChange > 0.5) isCorrect = true;
                else if (score < 45 && percentChange < -0.5) isCorrect = true;
                else if (score >= 45 && score <= 55 && Math.abs(percentChange) < 1.5) isCorrect = true;

                // Update Record
                await pool.query(
                    `UPDATE sentiment_history 
                    SET actual_price_change_24h = $1, is_correct = $2 
                    WHERE id = $3`,
                    [percentChange, isCorrect, row.id]
                );
            }

            if (result.rows.length > 0) {
                logger.info(`✅ Feedback Loop: Evaluated ${result.rows.length} past predictions.`);
            }
        } catch (error) {
            logger.error('❌ Feedback Job Failed:', error);
        }
    }
}

export const cronService = new CronService();
