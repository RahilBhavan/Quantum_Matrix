import pool from '../../config/database.js';

export interface Deposit {
    id: number;
    userId: number;
    walletAddress: string;
    assetAddress: string;
    assetSymbol: string;
    amount: string;
    amountUsd: number | null;
    txHash: string | null;
    status: 'pending' | 'success' | 'failed';
    errorMessage: string | null;
    gasCostEth: string | null;
    gasCostUsd: number | null;
    blockNumber: number | null;
    createdAt: Date;
    confirmedAt: Date | null;
}

export class DepositQueries {
    /**
     * Create a new deposit record
     */
    static async create(data: {
        userId: number;
        walletAddress: string;
        assetAddress: string;
        assetSymbol: string;
        amount: string;
        amountUsd?: number;
        txHash?: string;
    }): Promise<Deposit> {
        const query = `
            INSERT INTO deposits (
                user_id, wallet_address, asset_address, asset_symbol,
                amount, amount_usd, tx_hash, status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
            RETURNING *
        `;

        const result = await pool.query(query, [
            data.userId,
            data.walletAddress,
            data.assetAddress,
            data.assetSymbol,
            data.amount,
            data.amountUsd || null,
            data.txHash || null,
        ]);

        return this.mapRow(result.rows[0]);
    }

    /**
     * Update deposit status
     */
    static async updateStatus(
        id: number,
        status: 'success' | 'failed',
        data?: {
            txHash?: string;
            errorMessage?: string;
            gasCostEth?: string;
            gasCostUsd?: number;
            blockNumber?: number;
        }
    ): Promise<void> {
        const query = `
            UPDATE deposits
            SET status = $1,
                tx_hash = COALESCE($2, tx_hash),
                error_message = $3,
                gas_cost_eth = $4,
                gas_cost_usd = $5,
                block_number = $6,
                confirmed_at = CASE WHEN $1 = 'success' THEN CURRENT_TIMESTAMP ELSE NULL END
            WHERE id = $7
        `;

        await pool.query(query, [
            status,
            data?.txHash || null,
            data?.errorMessage || null,
            data?.gasCostEth || null,
            data?.gasCostUsd || null,
            data?.blockNumber || null,
            id,
        ]);
    }

    /**
     * Find deposits by wallet address
     */
    static async findByWallet(
        walletAddress: string,
        limit = 50,
        offset = 0
    ): Promise<{ data: Deposit[]; total: number }> {
        const countQuery = `
            SELECT COUNT(*) FROM deposits
            WHERE wallet_address = $1
        `;

        const dataQuery = `
            SELECT * FROM deposits
            WHERE wallet_address = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const [countResult, dataResult] = await Promise.all([
            pool.query(countQuery, [walletAddress]),
            pool.query(dataQuery, [walletAddress, limit, offset]),
        ]);

        return {
            data: dataResult.rows.map(this.mapRow),
            total: parseInt(countResult.rows[0].count),
        };
    }

    /**
     * Find deposit by transaction hash
     */
    static async findByTxHash(txHash: string): Promise<Deposit | null> {
        const query = `
            SELECT * FROM deposits
            WHERE tx_hash = $1
        `;

        const result = await pool.query(query, [txHash]);
        return result.rows.length > 0 ? this.mapRow(result.rows[0]) : null;
    }

    /**
     * Map database row to Deposit interface
     */
    private static mapRow(row: any): Deposit {
        return {
            id: row.id,
            userId: row.user_id,
            walletAddress: row.wallet_address,
            assetAddress: row.asset_address,
            assetSymbol: row.asset_symbol,
            amount: row.amount,
            amountUsd: row.amount_usd ? parseFloat(row.amount_usd) : null,
            txHash: row.tx_hash,
            status: row.status,
            errorMessage: row.error_message,
            gasCostEth: row.gas_cost_eth,
            gasCostUsd: row.gas_cost_usd ? parseFloat(row.gas_cost_usd) : null,
            blockNumber: row.block_number,
            createdAt: row.created_at,
            confirmedAt: row.confirmed_at,
        };
    }
}
