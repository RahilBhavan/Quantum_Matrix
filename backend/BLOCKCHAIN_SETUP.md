# Blockchain Integration Setup Guide

This guide explains how to set up and test the blockchain integration for automated rebalancing in Quantum Matrix.

## Overview

The rebalancing service now supports **real on-chain transaction execution** instead of paper trading. When properly configured, the system will:

1. Execute automated rebalancing transactions on Ethereum Sepolia testnet (or mainnet)
2. Update sentiment scores on-chain via the CoreVault contract
3. Track transaction status (pending → success/failed) in the database
4. Calculate real gas costs and update them after confirmation

## Prerequisites

- Ethereum wallet with private key (will act as "keeper")
- RPC endpoint (Infura, Alchemy, or local node)
- ETH for gas fees (Sepolia testnet ETH for testing)
- CoreVault contract must have your keeper address registered

## Environment Configuration

### 1. Update `.env` file

Add the following blockchain-related environment variables to `/backend/.env`:

```bash
# Blockchain Configuration
BLOCKCHAIN_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
BLOCKCHAIN_CHAIN_ID=11155111
KEEPER_PRIVATE_KEY=0x... # Your keeper wallet private key
CORE_VAULT_ADDRESS=0xEa454f612DCA53492301222e25dd1B2c4CD3c0c0
```

**Important Security Notes:**
- **NEVER** commit your `.env` file with real private keys to git
- Use a dedicated keeper wallet, not your personal wallet
- Start with testnet (Sepolia) before moving to mainnet
- Ensure the keeper wallet has sufficient ETH for gas fees

### 2. Get Testnet ETH (Sepolia)

If testing on Sepolia, get free testnet ETH from faucets:
- https://sepoliafaucet.com/
- https://faucet.chainstack.com/sepolia-faucet

Send at least 0.1 ETH to your keeper wallet address.

### 3. Register Keeper Address in CoreVault

The CoreVault contract must whitelist your keeper address before it can execute rebalances.

**Option A: Using Cast (Foundry)**

```bash
cd contracts

# Check if your address is a keeper
cast call $CORE_VAULT_ADDRESS "keepers(address)" YOUR_KEEPER_ADDRESS --rpc-url $SEPOLIA_RPC_URL

# If not, ask the contract owner to register you
# (Owner only - requires contract owner private key)
cast send $CORE_VAULT_ADDRESS "setKeeper(address,bool)" YOUR_KEEPER_ADDRESS true \
  --private-key $OWNER_PRIVATE_KEY \
  --rpc-url $SEPOLIA_RPC_URL
```

**Option B: Using Etherscan**

1. Go to https://sepolia.etherscan.io/address/0xEa454f612DCA53492301222e25dd1B2c4CD3c0c0#writeContract
2. Connect wallet (must be contract owner)
3. Call `setKeeper(address keeper, bool status)` with your keeper address and `true`

## Starting the Server

Once configured, start the backend server:

```bash
cd backend
npm run dev
```

You should see the following logs:

```
✅ PostgreSQL connection successful
✅ Redis connection successful
⚙️  Initializing blockchain service...
✅ Blockchain service initialized on chain 11155111
📍 CoreVault: 0xEa454f612DCA53492301222e25dd1B2c4CD3c0c0
🔑 Keeper: 0xYourKeeperAddress
✅ Blockchain service ready - Rebalancing will execute on-chain
🚀 Server running on port 3001
```

If blockchain credentials are **not** configured, you'll see:

```
⚠️  Blockchain credentials not configured. Rebalancing will use paper trading mode.
⚠️  Blockchain service not configured - Rebalancing will use paper trading mode
```

## Testing the Integration

### Test 1: Manual Rebalance Trigger

You can manually trigger a rebalance via API:

```bash
# Create a test user and allocation first
curl -X POST http://localhost:3001/api/allocations \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "0xYourTestWalletAddress",
    "ecosystem": "ethereum",
    "assetId": "asset-usdc",
    "assetSymbol": "USDC",
    "strategyLayers": [
      {
        "strategyId": "aave-v3",
        "condition": "Always",
        "weight": 50
      }
    ],
    "amount": 100
  }'

# Then trigger rebalance (this will execute via cron automatically)
# Or wait for the cron job to run (every 30 minutes)
```

### Test 2: Monitor Transaction Status

Check the database for transaction status:

```sql
SELECT
  id,
  user_id,
  asset_id,
  status,
  tx_hash,
  gas_cost_usd,
  error_message,
  executed_at
FROM rebalance_history
ORDER BY executed_at DESC
LIMIT 10;
```

**Status Flow:**
- `pending`: Transaction submitted to blockchain
- `success`: Transaction confirmed on-chain
- `failed`: Transaction reverted or submission failed

### Test 3: Verify On-Chain

Check your transaction on Etherscan:

```
https://sepolia.etherscan.io/tx/0x<YOUR_TX_HASH>
```

### Test 4: Check Keeper Balance

The keeper wallet will pay gas fees. Monitor its balance:

```bash
cast balance YOUR_KEEPER_ADDRESS --rpc-url $SEPOLIA_RPC_URL
```

## Troubleshooting

### Issue: "Blockchain service not initialized"

**Cause:** Missing or invalid environment variables

**Solution:**
1. Check `.env` file has all required variables
2. Verify `KEEPER_PRIVATE_KEY` starts with `0x`
3. Ensure `BLOCKCHAIN_RPC_URL` is accessible (test with `curl`)

### Issue: "Not keeper" error

**Cause:** Keeper address not registered in CoreVault contract

**Solution:**
- Contact contract owner to call `setKeeper(yourAddress, true)`
- Or if you're the owner, register yourself via Etherscan

### Issue: "Insufficient funds for gas"

**Cause:** Keeper wallet has insufficient ETH

**Solution:**
- Send more ETH to keeper wallet
- On Sepolia: Use testnet faucet
- On Mainnet: Ensure wallet is properly funded

### Issue: Transaction stuck in "pending"

**Cause:** Network congestion or gas price too low

**Solution:**
- Wait 5-10 minutes for confirmation
- Check transaction on Etherscan
- If stuck for >30 min, may need to speed up (not yet implemented)

### Issue: "User wallet address not found"

**Cause:** User not in database or `wallet_address` is NULL

**Solution:**
```sql
-- Check user exists
SELECT id, wallet_address FROM users WHERE id = <USER_ID>;

-- If missing, insert user
INSERT INTO users (wallet_address) VALUES ('0x...');
```

## Architecture

### Flow Diagram

```
Cron Job (every 30 min)
    ↓
RebalanceService.executeRebalance()
    ↓
1. Get sentiment from Gemini/S3
    ↓
2. Evaluate strategy conditions
    ↓
3. Get user wallet address from DB
    ↓
4. Estimate gas cost
    ↓
5. BlockchainService.executeRebalance()
    ↓
6. Submit transaction to network
    ↓
7. Save as "pending" in DB
    ↓
8. Background: Monitor transaction
    ↓
9. Update DB with final status
```

### Key Files

- **Service**: `/backend/src/services/blockchain.service.ts`
- **Rebalance Logic**: `/backend/src/services/rebalance.service.ts`
- **Database Queries**: `/backend/src/db/queries/rebalance.ts`
- **Contract Config**: `/config/contracts.ts`
- **Contract ABI**: `/config/abi/CoreVault.json`

## Paper Trading Fallback

If blockchain credentials are **not** configured, the system automatically falls back to **paper trading mode**:

- Mock transaction hashes are generated: `mock_tx_1234567890_123`
- Gas costs are hardcoded to $3.50
- Status is immediately set to `success`
- No actual blockchain interaction occurs

This allows development and testing without requiring testnet setup.

## Production Deployment

### Mainnet Configuration

When ready for production (mainnet):

1. Update `.env`:
```bash
BLOCKCHAIN_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
BLOCKCHAIN_CHAIN_ID=1
CORE_VAULT_ADDRESS=<MAINNET_CONTRACT_ADDRESS>
KEEPER_PRIVATE_KEY=<PRODUCTION_KEEPER_KEY>
```

2. **Security Checklist:**
   - [ ] Use environment secrets (not plaintext `.env`)
   - [ ] Keeper wallet has limited funds (top up regularly)
   - [ ] Set up monitoring for keeper balance
   - [ ] Enable alerts for failed transactions
   - [ ] Test thoroughly on testnet first
   - [ ] Implement rate limiting on rebalance frequency
   - [ ] Add multi-sig for keeper role (optional)

3. **Cost Monitoring:**
   - Track `gas_cost_usd` in `rebalance_history` table
   - Set up alerts if average gas cost exceeds threshold
   - Consider optimizing rebalance frequency based on gas prices

## API Reference

### Check Blockchain Status

```bash
# Not directly exposed, but logs show status on server startup
# Check server logs for:
# ✅ Blockchain service ready
# OR
# ⚠️  Blockchain service not configured
```

### Rebalance History

```bash
GET /api/rebalance/history/:walletAddress?limit=50&offset=0
```

Response includes:
- `txHash`: Blockchain transaction hash (or mock hash)
- `status`: pending | success | failed
- `gasCostUsd`: Actual gas cost in USD
- `errorMessage`: Error details if failed

## Next Steps

After successful integration:

1. **Add Frontend Display:**
   - Show transaction status in UI
   - Link to Etherscan for transaction verification
   - Display real-time gas costs

2. **Improve UX:**
   - Show "Pending" indicator while TX confirms
   - Add retry mechanism for failed transactions
   - Implement transaction speedup/cancel

3. **Monitoring:**
   - Set up alerts for keeper balance low
   - Track rebalance success rate
   - Monitor gas cost trends

4. **Optimization:**
   - Batch multiple rebalances into one TX
   - Implement gas price oracle for optimal timing
   - Add user preference for max gas price

## Support

For issues or questions:
- Check logs: `/backend/logs/app.log`
- Review database: Check `rebalance_history` table
- Verify contract: Use Etherscan contract reader

---

**Last Updated:** December 25, 2024
**Version:** 1.0.0
