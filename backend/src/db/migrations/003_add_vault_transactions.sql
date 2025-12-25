-- Migration: Add vault transaction tracking tables
-- Description: Creates tables for deposits, withdrawals, and token approvals

-- Deposits Table
CREATE TABLE IF NOT EXISTS deposits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) NOT NULL,
    asset_address VARCHAR(42) NOT NULL,
    asset_symbol VARCHAR(20) NOT NULL,
    amount DECIMAL(30, 18) NOT NULL,
    amount_usd DECIMAL(20, 8),
    tx_hash VARCHAR(66) UNIQUE,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    gas_cost_eth DECIMAL(20, 18),
    gas_cost_usd DECIMAL(10, 4),
    block_number BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    CONSTRAINT valid_deposit_status CHECK (status IN ('pending', 'success', 'failed')),
    CONSTRAINT valid_deposit_asset_address CHECK (asset_address ~ '^0x[a-fA-F0-9]{40}$')
);

-- Withdrawals Table
CREATE TABLE IF NOT EXISTS withdrawals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(42) NOT NULL,
    asset_address VARCHAR(42) NOT NULL,
    asset_symbol VARCHAR(20) NOT NULL,
    amount DECIMAL(30, 18) NOT NULL,
    amount_usd DECIMAL(20, 8),
    tx_hash VARCHAR(66) UNIQUE,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    gas_cost_eth DECIMAL(20, 18),
    gas_cost_usd DECIMAL(10, 4),
    block_number BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    CONSTRAINT valid_withdrawal_status CHECK (status IN ('pending', 'success', 'failed')),
    CONSTRAINT valid_withdrawal_asset_address CHECK (asset_address ~ '^0x[a-fA-F0-9]{40}$')
);

-- Token Approvals Table (track ERC20 approval status)
CREATE TABLE IF NOT EXISTS token_approvals (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,
    token_address VARCHAR(42) NOT NULL,
    spender_address VARCHAR(42) NOT NULL,
    approved_amount DECIMAL(30, 18) NOT NULL,
    tx_hash VARCHAR(66),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(wallet_address, token_address, spender_address)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_deposits_wallet ON deposits(wallet_address);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_created ON deposits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_tx_hash ON deposits(tx_hash);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_wallet ON withdrawals(wallet_address);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created ON withdrawals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_tx_hash ON withdrawals(tx_hash);

CREATE INDEX IF NOT EXISTS idx_approvals_wallet_token ON token_approvals(wallet_address, token_address);

-- Trigger for auto-updating token_approvals timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_token_approvals_updated_at ON token_approvals;
CREATE TRIGGER update_token_approvals_updated_at
    BEFORE UPDATE ON token_approvals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
