-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_tvl DECIMAL(20, 8) DEFAULT 0,
    last_rebalance_at TIMESTAMP,
    preferences JSONB DEFAULT '{}'::jsonb,
    CONSTRAINT valid_address CHECK (wallet_address ~ '^0x[a-fA-F0-9]{40}$')
);

-- Allocations Table
CREATE TABLE IF NOT EXISTS allocations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ecosystem VARCHAR(50) NOT NULL,
    asset_id VARCHAR(100) NOT NULL,
    asset_symbol VARCHAR(20) NOT NULL,
    strategy_layers JSONB NOT NULL,
    amount DECIMAL(20, 8) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, ecosystem, asset_id)
);

-- Rebalance History Table
CREATE TABLE IF NOT EXISTS rebalance_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    allocation_id INTEGER REFERENCES allocations(id) ON DELETE SET NULL,
    ecosystem VARCHAR(50) NOT NULL,
    asset_id VARCHAR(100) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL,
    sentiment_score INTEGER,
    sentiment_label VARCHAR(20),
    gas_cost_usd DECIMAL(10, 4),
    profit_usd DECIMAL(20, 8),
    tx_hash VARCHAR(66),
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_sentiment CHECK (sentiment_score BETWEEN 0 AND 100),
    CONSTRAINT valid_status CHECK (status IN ('pending', 'success', 'failed'))
);

-- Sentiment History Table
CREATE TABLE IF NOT EXISTS sentiment_history (
    id SERIAL PRIMARY KEY,
    score INTEGER NOT NULL,
    label VARCHAR(20) NOT NULL,
    summary TEXT,
    trending_topics JSONB,
    confidence DECIMAL(3, 2),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_score CHECK (score BETWEEN 0 AND 100)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_allocations_user ON allocations(user_id);
CREATE INDEX IF NOT EXISTS idx_allocations_ecosystem ON allocations(ecosystem);
CREATE INDEX IF NOT EXISTS idx_rebalance_user ON rebalance_history(user_id);
CREATE INDEX IF NOT EXISTS idx_rebalance_executed ON rebalance_history(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_sentiment_recorded ON sentiment_history(recorded_at DESC);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for auto-updating timestamps
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_allocations_updated_at ON allocations;
CREATE TRIGGER update_allocations_updated_at BEFORE UPDATE ON allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
