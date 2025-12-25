import pool from '../../config/database.js';
import type { User } from '../types/index.js';

export class UserQueries {
    /**
     * Create a new user
     */
    static async create(walletAddress: string): Promise<User> {
        const query = `
      INSERT INTO users (wallet_address)
      VALUES ($1)
      ON CONFLICT (wallet_address) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

        const result = await pool.query(query, [walletAddress.toLowerCase()]);
        return this.mapRow(result.rows[0]);
    }

    /**
     * Find user by wallet address
     */
    static async findByAddress(walletAddress: string): Promise<User | null> {
        const query = `SELECT * FROM users WHERE wallet_address = $1`;
        const result = await pool.query(query, [walletAddress.toLowerCase()]);

        if (result.rows.length === 0) return null;
        return this.mapRow(result.rows[0]);
    }

    /**
     * Update user TVL
     */
    static async updateTvl(userId: number, totalTvl: number): Promise<void> {
        const query = `UPDATE users SET total_tvl = $1 WHERE id = $2`;
        await pool.query(query, [totalTvl, userId]);
    }

    /**
     * Update last rebalance timestamp
     */
    static async updateLastRebalance(userId: number): Promise<void> {
        const query = `UPDATE users SET last_rebalance_at = CURRENT_TIMESTAMP WHERE id = $2`;
        await pool.query(query, [userId]);
    }

    /**
     * Get user statistics
     */
    static async getStats(userId: number): Promise<any> {
        const query = `
      SELECT 
        u.*,
        COUNT(DISTINCT a.id) as total_allocations,
        COUNT(r.id) as total_rebalances,
        AVG(r.gas_cost_usd) as avg_gas_cost,
        SUM(r.profit_usd) as total_profit
      FROM users u
      LEFT JOIN allocations a ON u.id = a.user_id
      LEFT JOIN rebalance_history r ON u.id = r.user_id AND r.status = 'success'
      WHERE u.id = $1
      GROUP BY u.id
    `;

        const result = await pool.query(query, [userId]);
        return result.rows[0];
    }

    /**
     * Map database row to User type
     */
    private static mapRow(row: any): User {
        return {
            id: row.id,
            walletAddress: row.wallet_address,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            totalTvl: parseFloat(row.total_tvl),
            lastRebalanceAt: row.last_rebalance_at,
            preferences: row.preferences,
        };
    }
}
