import pool from '../../config/database.js';

export interface TokenApproval {
    id: number;
    walletAddress: string;
    tokenAddress: string;
    spenderAddress: string;
    approvedAmount: string;
    txHash: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export class ApprovalQueries {
    /**
     * Insert or update token approval
     */
    static async upsert(data: {
        walletAddress: string;
        tokenAddress: string;
        spenderAddress: string;
        approvedAmount: string;
        txHash?: string;
    }): Promise<void> {
        const query = `
            INSERT INTO token_approvals (
                wallet_address, token_address, spender_address, approved_amount, tx_hash
            )
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (wallet_address, token_address, spender_address)
            DO UPDATE SET
                approved_amount = $4,
                tx_hash = $5,
                updated_at = CURRENT_TIMESTAMP
        `;

        await pool.query(query, [
            data.walletAddress,
            data.tokenAddress,
            data.spenderAddress,
            data.approvedAmount,
            data.txHash || null,
        ]);
    }

    /**
     * Get approval amount for specific token and spender
     */
    static async getApproval(
        walletAddress: string,
        tokenAddress: string,
        spenderAddress: string
    ): Promise<string | null> {
        const query = `
            SELECT approved_amount FROM token_approvals
            WHERE wallet_address = $1 AND token_address = $2 AND spender_address = $3
        `;

        const result = await pool.query(query, [walletAddress, tokenAddress, spenderAddress]);
        return result.rows.length > 0 ? result.rows[0].approved_amount : null;
    }

    /**
     * Get all approvals for a wallet
     */
    static async getWalletApprovals(walletAddress: string): Promise<TokenApproval[]> {
        const query = `
            SELECT * FROM token_approvals
            WHERE wallet_address = $1
            ORDER BY updated_at DESC
        `;

        const result = await pool.query(query, [walletAddress]);
        return result.rows.map(this.mapRow);
    }

    /**
     * Map database row to TokenApproval interface
     */
    private static mapRow(row: any): TokenApproval {
        return {
            id: row.id,
            walletAddress: row.wallet_address,
            tokenAddress: row.token_address,
            spenderAddress: row.spender_address,
            approvedAmount: row.approved_amount,
            txHash: row.tx_hash,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
}
