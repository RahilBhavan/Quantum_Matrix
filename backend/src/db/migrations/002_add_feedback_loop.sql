-- Upgrade Sentiment History for Feedback Loop
ALTER TABLE sentiment_history 
ADD COLUMN IF NOT EXISTS market_price_eth DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS actual_price_change_24h DECIMAL(10, 4),
ADD COLUMN IF NOT EXISTS is_correct BOOLEAN,
ADD COLUMN IF NOT EXISTS reasoning TEXT;

-- Index for finding unevaluated sentiments
CREATE INDEX IF NOT EXISTS idx_sentiment_unevaluated 
ON sentiment_history(recorded_at) 
WHERE actual_price_change_24h IS NULL;
