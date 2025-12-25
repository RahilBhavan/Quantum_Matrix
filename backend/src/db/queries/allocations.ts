import pool from '../../config/database.js';
import type { UserAllocation, StrategyLayer } from '../../types/index';

export class AllocationQueries {
    /**
     * Create a new allocation
     */
    static async create(
        userId: number,
        ecosystem: string,
        assetId: string,
        assetSymbol: string,
        strategyLayers: StrategyLayer[],
        amount: number
    ): Promise<UserAllocation> {
        const query = `
      INSERT INTO allocations (user_id, ecosystem, asset_id, asset_symbol, strategy_layers, amount)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, ecosystem, asset_id) 
      DO UPDATE SET 
        strategy_layers = $5,
        amount = $6,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

        const result = await pool.query(query, [
            userId,
            ecosystem,
            assetId,
            assetSymbol,
            JSON.stringify(strategyLayers),
            amount,
        ]);

        return this.mapRow(result.rows[0]);
    }

    /**
     * Find all allocations
     */
    static async findAll(): Promise<UserAllocation[]> {
        const query = `SELECT * FROM allocations ORDER BY created_at DESC`;
        const result = await pool.query(query);
        return result.rows.map(this.mapRow);
    }

    /**
     * Find allocations by user ID
     */
    static async findByUserId(
        userId: number,
        ecosystem?: string
    ): Promise<UserAllocation[]> {
        let query = `SELECT * FROM allocations WHERE user_id = $1`;
        const params: any[] = [userId];

        if (ecosystem) {
            query += ` AND ecosystem = $2`;
            params.push(ecosystem);
        }

        query += ` ORDER BY created_at DESC`;

        const result = await pool.query(query, params);
        return result.rows.map(this.mapRow);
    }

    /**
     * Find allocation by ID
     */
    static async findById(id: number): Promise<UserAllocation | null> {
        const query = `SELECT * FROM allocations WHERE id = $1`;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) return null;
        return this.mapRow(result.rows[0]);
    }

    /**
     * Delete allocation
     */
    static async delete(userId: number, assetId: string): Promise<boolean> {
        const query = `DELETE FROM allocations WHERE user_id = $1 AND asset_id = $2`;
        const result = await pool.query(query, [userId, assetId]);
        return result.rowCount !== null && result.rowCount > 0;
    }

    /**
     * Update allocation amount
     */
    static async updateAmount(id: number, amount: number): Promise<void> {
        const query = `UPDATE allocations SET amount = $1 WHERE id = $2`;
        await pool.query(query, [amount, id]);
    }

    /**
     * Map database row to UserAllocation type
     */
    private static mapRow(row: any): UserAllocation {
        return {
            id: row.id,
            userId: row.user_id,
            ecosystem: row.ecosystem,
            assetId: row.asset_id,
            assetSymbol: row.asset_symbol,
            strategyLayers: row.strategy_layers,
            amount: parseFloat(row.amount),
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
