import pool from '../../config/database.js';
import type { RebalanceHistory } from '../../types/index';

export class RebalanceQueries {
    /**
     * Create a new rebalance record
     */
    static async create(data: {
        userId: number;
        allocationId?: number;
        ecosystem: string;
        assetId: string;
        triggerType: string;
        sentimentScore?: number;
        sentimentLabel?: string;
        gasCostUsd?: number;
        profitUsd?: number;
        txHash?: string;
        status?: 'pending' | 'success' | 'failed';
        errorMessage?: string;
    }): Promise<RebalanceHistory> {
        const query = `
      INSERT INTO rebalance_history (
        user_id, allocation_id, ecosystem, asset_id, trigger_type,
        sentiment_score, sentiment_label, gas_cost_usd, profit_usd,
        tx_hash, status, error_message
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

        const result = await pool.query(query, [
            data.userId,
            data.allocationId || null,
            data.ecosystem,
            data.assetId,
            data.triggerType,
            data.sentimentScore || null,
            data.sentimentLabel || null,
            data.gasCostUsd || null,
            data.profitUsd || null,
            data.txHash || null,
            data.status || 'pending',
            data.errorMessage || null,
        ]);

        return this.mapRow(result.rows[0]);
    }

    /**
     * Find rebalance history by user ID
     */
    static async findByUserId(
        userId: number,
        limit: number = 50,
        offset: number = 0
    ): Promise<{ data: RebalanceHistory[]; total: number }> {
        const countQuery = `SELECT COUNT(*) FROM rebalance_history WHERE user_id = $1`;
        const dataQuery = `
      SELECT * FROM rebalance_history 
      WHERE user_id = $1 
      ORDER BY executed_at DESC 
      LIMIT $2 OFFSET $3
    `;

        const [countResult, dataResult] = await Promise.all([
            pool.query(countQuery, [userId]),
            pool.query(dataQuery, [userId, limit, offset]),
        ]);

        return {
            data: dataResult.rows.map(this.mapRow),
            total: parseInt(countResult.rows[0].count),
        };
    }

    /**
     * Update rebalance status
     */
    static async updateStatus(
        id: number,
        status: 'success' | 'failed',
        txHash?: string,
        errorMessage?: string
    ): Promise<void> {
        const query = `
      UPDATE rebalance_history
      SET status = $1, tx_hash = $2, error_message = $3
      WHERE id = $4
    `;
        await pool.query(query, [status, txHash || null, errorMessage || null, id]);
    }

    /**
     * Update rebalance record with partial data
     */
    static async update(
        id: number,
        data: {
            status?: 'pending' | 'success' | 'failed';
            gasCostUsd?: number;
            profitUsd?: number;
            txHash?: string;
            errorMessage?: string | null;
        }
    ): Promise<void> {
        const fields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (data.status !== undefined) {
            fields.push(`status = $${paramCount++}`);
            values.push(data.status);
        }
        if (data.gasCostUsd !== undefined) {
            fields.push(`gas_cost_usd = $${paramCount++}`);
            values.push(data.gasCostUsd);
        }
        if (data.profitUsd !== undefined) {
            fields.push(`profit_usd = $${paramCount++}`);
            values.push(data.profitUsd);
        }
        if (data.txHash !== undefined) {
            fields.push(`tx_hash = $${paramCount++}`);
            values.push(data.txHash);
        }
        if (data.errorMessage !== undefined) {
            fields.push(`error_message = $${paramCount++}`);
            values.push(data.errorMessage);
        }

        if (fields.length === 0) {
            return; // Nothing to update
        }

        values.push(id);
        const query = `UPDATE rebalance_history SET ${fields.join(', ')} WHERE id = $${paramCount}`;
        await pool.query(query, values);
    }

    /**
     * Map database row to RebalanceHistory type
     */
    private static mapRow(row: any): RebalanceHistory {
        return {
            id: row.id,
            userId: row.user_id,
            allocationId: row.allocation_id,
            ecosystem: row.ecosystem,
            assetId: row.asset_id,
            triggerType: row.trigger_type,
            sentimentScore: row.sentiment_score,
            sentimentLabel: row.sentiment_label,
            gasCostUsd: row.gas_cost_usd ? parseFloat(row.gas_cost_usd) : null,
            profitUsd: row.profit_usd ? parseFloat(row.profit_usd) : null,
            txHash: row.tx_hash,
            status: row.status,
            errorMessage: row.error_message,
            executedAt: row.executed_at,
        };
    }
}
