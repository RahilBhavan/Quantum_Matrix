# Wallet Balance Integration Guide

This guide explains how the wallet balance fetching system works in Quantum Matrix, replacing hardcoded mock data with real on-chain balances.

## Overview

The system now **fetches real token balances** from the blockchain for connected wallets, including:

- Native tokens (ETH on Ethereum/Arbitrum)
- ERC20 tokens (USDC, USDT, WBTC, UNI, LDO, LINK, ARB, GMX, RDNT, etc.)
- Real-time prices from CoinGecko API
- Multi-chain support (Ethereum Mainnet, Arbitrum, Sepolia Testnet)
- Intelligent caching to minimize RPC/API calls

##Before vs After

### **Before** (Hardcoded Mock Data):
```typescript
// constants.ts
assets: [
  { id: 'asset-eth', balance: 25000, price: 2800 }, // ← Always shows $25,000
  { id: 'asset-usdc', balance: 15000, price: 1 },   // ← Never changes
]
```

### **After** (Real Blockchain Data):
```typescript
// Fetched from blockchain when wallet connects
const balances = await ApiClient.getWalletBalances(address, chainId);
// Returns actual balances from user's wallet
```

---

## Architecture

### Flow Diagram

```
User connects wallet
    ↓
App.tsx: loadWalletBalances()
    ↓
API: GET /api/wallet/balances/:address?chainId=1
    ↓
WalletBalanceService.getWalletBalances()
    ↓
┌─────────────────────────────┬──────────────────────────────┐
│   Fetch Token Balances      │    Fetch Token Prices        │
│   (ethers.js + RPC)         │    (CoinGecko API)           │
├─────────────────────────────┼──────────────────────────────┤
│ • ETH: getBalance()         │ • ethereum: $2,800           │
│ • USDC: balanceOf()         │ • usd-coin: $1.00            │
│ • WBTC: balanceOf()         │ • wrapped-bitcoin: $95,000   │
└─────────────────────────────┴──────────────────────────────┘
    ↓
Calculate USD values
    ↓
Cache in Redis (30 seconds)
    ↓
Return to frontend
    ↓
Update ecosystem assets with real balances
```

---

## Supported Chains & Tokens

### Ethereum Mainnet (Chain ID: 1)
- **ETH** - Native Ether
- **USDC** - USD Coin (`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`)
- **USDT** - Tether (`0xdAC17F958D2ee523a2206206994597C13D831ec7`)
- **WBTC** - Wrapped Bitcoin (`0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599`)
- **UNI** - Uniswap (`0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984`)
- **LDO** - Lido DAO (`0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32`)
- **LINK** - Chainlink (`0x514910771AF9Ca656af840dff83E8264EcF986CA`)

### Arbitrum One (Chain ID: 42161)
- **ETH** - Native Ether
- **ARB** - Arbitrum (`0x912CE59144191C1204E64559FE8253a0e49E6548`)
- **USDC** - USD Coin (`0xaf88d065e77c8cC2239327C5EDb3A432268e5831`)
- **GMX** - GMX (`0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a`)
- **RDNT** - Radiant Capital (`0x3082CC23568eA640225c2467653dB90e9250AaA0`)

### Sepolia Testnet (Chain ID: 11155111)
- **ETH** - Testnet Ether
- **USDC** - Mock USDC (`0x08009c047eA5a848997885d69E0352faab9B5Ee3`)

---

## API Reference

### 1. Get Wallet Balances

**Endpoint**: `GET /api/wallet/balances/:address`

**Query Parameters**:
- `chainId` (optional): Chain ID (default: 1 for Ethereum Mainnet)

**Example**:
```bash
curl "http://localhost:3001/api/wallet/balances/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb?chainId=1"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "chainId": 1,
    "totalBalanceUsd": 125430.50,
    "tokens": [
      {
        "symbol": "ETH",
        "balance": "12.456",
        "balanceRaw": "12456000000000000000",
        "balanceUsd": 34876.80,
        "price": 2800,
        "address": "0x0000000000000000000000000000000000000000"
      },
      {
        "symbol": "USDC",
        "balance": "50000.00",
        "balanceRaw": "50000000000",
        "balanceUsd": 50000.00,
        "price": 1.00,
        "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
      }
    ],
    "lastUpdated": "2024-12-25T10:30:00.000Z"
  }
}
```

### 2. Refresh Wallet Balances

**Endpoint**: `POST /api/wallet/refresh/:address`

Clears cache and refetches balances.

**Query Parameters**:
- `chainId` (optional): Specific chain to refresh (if omitted, clears all chains)

**Example**:
```bash
curl -X POST "http://localhost:3001/api/wallet/refresh/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb?chainId=1"
```

### 3. Get Supported Tokens

**Endpoint**: `GET /api/wallet/tokens/:chainId`

**Example**:
```bash
curl "http://localhost:3001/api/wallet/tokens/1"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "chainId": 1,
    "tokens": [
      {
        "address": "0x0000000000000000000000000000000000000000",
        "symbol": "ETH",
        "decimals": 18,
        "coingeckoId": "ethereum"
      },
      {
        "address": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "symbol": "USDC",
        "decimals": 6,
        "coingeckoId": "usd-coin"
      }
    ]
  }
}
```

### 4. Get Token Prices

**Endpoint**: `GET /api/wallet/prices`

**Query Parameters**:
- `ids`: Comma-separated CoinGecko IDs (max 100)

**Example**:
```bash
curl "http://localhost:3001/api/wallet/prices?ids=ethereum,usd-coin,wrapped-bitcoin"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "ethereum": 2800,
    "usd-coin": 1.00,
    "wrapped-bitcoin": 95000
  }
}
```

### 5. Get Supported Chains

**Endpoint**: `GET /api/wallet/chains`

**Response**:
```json
{
  "success": true,
  "data": [
    { "chainId": 1, "name": "Ethereum Mainnet" },
    { "chainId": 11155111, "name": "Sepolia Testnet" },
    { "chainId": 42161, "name": "Arbitrum One" }
  ]
}
```

---

## Caching Strategy

The system implements two-tier caching to optimize performance:

### 1. Redis Cache (Backend)
- **Balance Cache**: 30 seconds TTL
  - Key format: `wallet_balances:{chainId}:{address}`
  - Stores complete balance response
- **Price Cache**: 5 minutes TTL
  - Key format: `price:{coingeckoId}`
  - Stores individual token prices

### 2. In-Memory Cache (Backend)
- **Price Cache**: 5 minutes TTL
  - Reduces Redis lookups for frequently requested prices
  - Auto-syncs with Redis cache

### Cache Benefits
- **Reduces RPC calls**: Avoid hitting rate limits on free RPC endpoints
- **Faster responses**: Cached balances return in <10ms vs ~500ms for fresh fetch
- **Lower costs**: Fewer CoinGecko API calls (rate-limited on free tier)

---

## Environment Configuration

Update `.env` in `/backend`:

```bash
# Multi-Chain RPC URLs (for balance fetching)
MAINNET_RPC_URL=https://eth.llamarpc.com
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc

# Optional: Use Infura/Alchemy for better reliability (recommended for production)
# MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
# ARBITRUM_RPC_URL=https://arbitrum-mainnet.infura.io/v3/YOUR_PROJECT_ID
```

**Note**: The service uses free public RPCs by default but will use environment variables if provided.

---

## Frontend Integration

### In App.tsx

When a wallet connects, the app automatically:

1. **Fetches balances** for Ethereum and Arbitrum
2. **Updates ecosystem assets** with real data
3. **Shows toast notification** on success/error
4. **Falls back to mock data** if fetching fails

```typescript
// Automatic on wallet connect
useEffect(() => {
  if (isConnected && address) {
    loadUserAllocations();
    loadWalletBalances(); // ← Fetches real balances
  } else {
    setEcosystemsWithBalances(ECOSYSTEMS); // ← Reset to mock
  }
}, [isConnected, address]);
```

### Loading States

The app shows loading indicators:

```typescript
const [isLoadingBalances, setIsLoadingBalances] = useState(false);

// In UI
{isLoadingBalances && <Loader2 className="animate-spin" />}
```

---

## Adding New Tokens

To add support for a new token, update `TOKEN_CONFIGS` in:
`backend/src/services/wallet-balance.service.ts`

```typescript
const TOKEN_CONFIGS: Record<number, Record<string, TokenConfig>> = {
  1: { // Ethereum Mainnet
    // ... existing tokens ...
    AAVE: {
      address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
      symbol: 'AAVE',
      decimals: 18,
      coingeckoId: 'aave'
    },
  }
};
```

Then update `constants.ts` in the frontend to include the new token in the ecosystem's assets array.

---

## Troubleshooting

### Issue: "Failed to load wallet balances"

**Possible Causes**:
1. **RPC endpoint down**: Try using Infura/Alchemy instead of public RPCs
2. **Rate limit hit**: Caching should prevent this, but may occur on first load
3. **Invalid address**: Ensure wallet address is properly connected
4. **Network error**: Check internet connection

**Solution**:
```bash
# Check if RPC is accessible
curl -X POST https://eth.llamarpc.com \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Should return current block number
```

### Issue: Prices showing as $0

**Cause**: CoinGecko API rate limit or network error

**Solution**:
- Prices are cached for 5 minutes, so this should be temporary
- Check CoinGecko API status: https://status.coingecko.com/
- Consider using CoinGecko Pro API for production (higher rate limits)

### Issue: Balances not updating

**Cause**: Cache is still valid (30 second TTL)

**Solution**:
```bash
# Force refresh by clearing cache
curl -X POST "http://localhost:3001/api/wallet/refresh/YOUR_ADDRESS"
```

Or add a "Refresh" button in the UI.

### Issue: Some tokens showing zero balance but user owns them

**Cause**: Token not in `TOKEN_CONFIGS`

**Solution**: Add the token to the supported tokens list (see "Adding New Tokens" section above)

---

## Performance Considerations

### Optimizations Implemented
1. **Parallel fetching**: All token balances fetched concurrently
2. **Price batching**: Multiple prices fetched in single API call
3. **Redis caching**: Avoids redundant blockchain queries
4. **In-memory cache**: Reduces Redis latency
5. **Zero-balance filtering**: Frontend only displays tokens with balance > 0

### Expected Response Times
- **Cached**: <50ms
- **Uncached (ETH + 5 tokens)**: ~500-800ms
- **Uncached (with price fetch)**: ~1-1.5s

### Rate Limits
- **Public RPCs**: ~100 req/min (varies by provider)
- **CoinGecko Free**: 50 calls/minute
- **Redis**: No practical limit for this use case

---

## Future Enhancements

Potential improvements:
1. **Solana Support**: Add Solana RPC integration for SPL token balances
2. **NFT Balances**: Show NFTs alongside fungible tokens
3. **Historical Balances**: Track balance changes over time
4. **Portfolio Analytics**: Show gains/losses, PnL tracking
5. **Custom Token Import**: Let users add any ERC20 token by address
6. **WebSocket Updates**: Real-time balance updates without refresh
7. **Gas Optimization**: Batch multiple balanceOf calls into single multicall

---

## Security Notes

- **No Private Keys**: Service only reads public data (balances)
- **Rate Limiting**: API endpoints are rate-limited to prevent abuse
- **Input Validation**: All addresses validated before querying blockchain
- **Error Handling**: Graceful fallback to mock data on errors
- **CORS Protection**: Only allowed origins can access API

---

## Testing

### Manual Testing

1. **Connect Wallet**: Use any address with real token holdings
2. **Verify Balances**: Check they match what's shown in MetaMask/Etherscan
3. **Disconnect**: Should revert to mock data
4. **Reconnect**: Should refetch real balances

### Example Test Wallet (Ethereum Mainnet)

Use a well-known address with public holdings:
```
Vitalik's Address: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

This address typically holds ETH, various ERC20s, and NFTs.

---

**Last Updated**: December 25, 2024
**Version**: 1.0.0
