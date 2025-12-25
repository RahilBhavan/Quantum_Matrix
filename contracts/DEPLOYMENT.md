# Quantum Matrix - Deployment Guide

## Prerequisites

Before deploying to Sepolia, ensure you have:

1. **Sepolia ETH** (minimum 0.1 ETH)
   - Get from [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
   - Or [Chainlink Faucet](https://faucets.chain.link/)

2. **Alchemy API Key**
   - Sign up at [alchemy.com](https://www.alchemy.com/)
   - Create app for Ethereum Sepolia
   - Copy HTTPS URL

3. **Etherscan API Key**
   - Sign up at [etherscan.io](https://etherscan.io/)
   - Go to My Profile → API Keys
   - Create new key

## Quick Start

### 1. Configure Environment

```bash
cd contracts
cp .env.example .env
# Edit .env with your keys
```

### 2. Deploy to Sepolia

```bash
# Load environment
source .env

# Deploy
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -vvvv
```

### 3. Update Frontend

After deployment, update `/Users/rahilbhavan/Quantum_Matrix/.env`:

```bash
VITE_CORE_VAULT_SEPOLIA=<PROXY_ADDRESS>
VITE_MOCK_ADAPTER_SEPOLIA=<ADAPTER_ADDRESS>
VITE_MOCK_USDC_SEPOLIA=<USDC_ADDRESS>
```

Also update `config/contracts.ts` with the deployed addresses.

### 4. Test

```bash
# Get test USDC
cast send MOCK_USDC_ADDRESS "mint(address,uint256)" YOUR_ADDRESS 1000000000 \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY

# Approve vault
cast send MOCK_USDC_ADDRESS "approve(address,uint256)" VAULT_ADDRESS 1000000000 \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY

# Deposit
cast send VAULT_ADDRESS "deposit(address,uint256)" MOCK_USDC_ADDRESS 1000000 \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

## Deployed Contracts

### Sepolia Testnet

- **CoreVault Proxy**: TBD
- **CoreVault Implementation**: TBD
- **Mock USDC**: TBD
- **Mock Yield Adapter**: TBD

## Verification

All contracts are automatically verified on Etherscan during deployment. If verification fails, use:

```bash
forge verify-contract \
  --chain-id 11155111 \
  CONTRACT_ADDRESS \
  CONTRACT_PATH:CONTRACT_NAME \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

## Troubleshooting

### "Insufficient funds"
Get more Sepolia ETH from faucets

### "Nonce too low"
```bash
cast nonce YOUR_ADDRESS --rpc-url $SEPOLIA_RPC_URL
```

### "Verification failed"
Wait 1 minute and try manual verification

## Next Steps

1. Test full user flow in frontend
2. Deploy real strategy adapters (Aave, Uniswap)
3. Set up keeper bot for automated rebalancing
4. Prepare for mainnet deployment
