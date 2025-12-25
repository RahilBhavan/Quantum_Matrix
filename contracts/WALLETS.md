# Sepolia Testnet Wallets

**Generated**: December 24, 2024

## Deployer Wallet
- **Address**: `0xFBf4D43EaF569974c4782112a94aD38d573d9c7d`
- **Private Key**: `0xb025bd1b088b5eb5bebe24d0609040afcffdd6d920d9c57d506a7b1ce40c08ff`
- **Purpose**: Owns contracts, can upgrade, approve adapters
- **Required Balance**: 0.1 Sepolia ETH

## Keeper Wallet
- **Address**: `0xe8CB1386229963B33f0aB344835043C8487e6E77`
- **Private Key**: `0xc538d0fcf61933ef523ab887b71c136550b330b96511168e8a8332d94a823bcd`
- **Purpose**: Executes automated rebalances, updates sentiment
- **Required Balance**: 0.05 Sepolia ETH

---

## Next Steps

### 1. Fund Wallets with Sepolia ETH

**Deployer Wallet** (needs ~0.1 ETH):
```
Address: 0xFBf4D43EaF569974c4782112a94aD38d573d9c7d
```

**Keeper Wallet** (needs ~0.05 ETH):
```
Address: 0xe8CB1386229963B33f0aB344835043C8487e6E77
```

**Faucets**:
- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/) - 0.5 ETH/day
- [Chainlink Faucet](https://faucets.chain.link/) - 0.1 ETH
- [QuickNode Faucet](https://faucet.quicknode.com/ethereum/sepolia) - 0.05 ETH

### 2. Get Alchemy API Key

1. Go to [alchemy.com](https://www.alchemy.com/)
2. Sign up / Log in
3. Create new app:
   - **Name**: Quantum Matrix Sepolia
   - **Chain**: Ethereum
   - **Network**: Sepolia
4. Copy HTTPS URL
5. Update `.env` with: `SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY`

### 3. Get Etherscan API Key

1. Go to [etherscan.io](https://etherscan.io/)
2. Sign up / Log in
3. Go to **My Profile** → **API Keys**
4. Create new key
5. Update `.env` with: `ETHERSCAN_API_KEY=YOUR_KEY`

### 4. Check Balances

```bash
# Check deployer balance
cast balance 0xFBf4D43EaF569974c4782112a94aD38d573d9c7d --rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Check keeper balance
cast balance 0xe8CB1386229963B33f0aB344835043C8487e6E77 --rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

---

## Security Notes

⚠️ **IMPORTANT**:
- These are **testnet wallets only** - DO NOT use for mainnet
- Private keys are stored in `.env` (which is gitignored)
- For mainnet, use hardware wallet or multi-sig
- Keep a backup of these keys in a secure location

---

## Ready to Deploy?

Once you have:
- ✅ Funded both wallets with Sepolia ETH
- ✅ Added Alchemy API key to `.env`
- ✅ Added Etherscan API key to `.env`

Run:
```bash
cd contracts
source .env
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -vvvv
```
