# Deployment & Testing Guide

## Quick Start (5 minutes)

### 1. Deploy Smart Contracts to Sepolia

```bash
cd /Users/rahilbhavan/Quantum_Matrix/contracts

# Load environment variables
source .env

# Deploy Aave V3 Adapter
forge script script/DeployAaveAdapter.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -vv

# Deploy Uniswap V3 Adapter
forge script script/DeployUniswapV3Adapter.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -vv

# Deploy Strategy Composer
forge create src/StrategyComposer.sol:StrategyComposer \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --constructor-args \
    0xEa454f612DCA53492301222e25dd1B2c4CD3c0c0 \
    <AAVE_ADAPTER_ADDRESS> \
    <UNISWAP_ADAPTER_ADDRESS> \
    0x0000000000000000000000000000000000000000 \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Deploy Rebalance Optimizer
forge create src/RebalanceOptimizer.sol:RebalanceOptimizer \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --constructor-args 0xEa454f612DCA53492301222e25dd1B2c4CD3c0c0 \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### 2. Approve Adapters in CoreVault

```bash
# Get CoreVault address
VAULT=0xEa454f612DCA53492301222e25dd1B2c4CD3c0c0

# Approve Aave adapter
cast send $VAULT \
  "setAdapterApproval(address,bool)" \
  <AAVE_ADAPTER_ADDRESS> \
  true \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY

# Approve Uniswap adapter
cast send $VAULT \
  "setAdapterApproval(address,bool)" \
  <UNISWAP_ADAPTER_ADDRESS> \
  true \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### 3. Update Frontend Environment Variables

```bash
cd /Users/rahilbhavan/Quantum_Matrix

# Edit .env file
cat >> .env << EOF
VITE_AAVE_ADAPTER_SEPOLIA=<AAVE_ADAPTER_ADDRESS>
VITE_UNISWAP_ADAPTER_SEPOLIA=<UNISWAP_ADAPTER_ADDRESS>
VITE_STRATEGY_COMPOSER_SEPOLIA=<COMPOSER_ADDRESS>
VITE_REBALANCE_OPTIMIZER_SEPOLIA=<OPTIMIZER_ADDRESS>
EOF
```

### 4. Test Frontend Locally

```bash
# Frontend should already be running on http://localhost:5173
# Navigate to http://localhost:5173/strategy

# Or restart if needed:
npm run dev
```

---

## Detailed Deployment Steps

### Step 1: Verify Prerequisites

```bash
# Check you have Sepolia ETH
cast balance $DEPLOYER_ADDRESS --rpc-url $SEPOLIA_RPC_URL

# Should show > 0.1 ETH for deployment costs
```

### Step 2: Deploy Adapters

**Aave V3 Adapter**:
```bash
cd /Users/rahilbhavan/Quantum_Matrix/contracts

forge script script/DeployAaveAdapter.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -vv

# Save the deployed address
AAVE_ADAPTER=<address_from_output>
```

**Uniswap V3 Adapter**:
```bash
forge script script/DeployUniswapV3Adapter.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  -vv

# Save the deployed address
UNISWAP_ADAPTER=<address_from_output>
```

### Step 3: Deploy Strategy Composer

```bash
# Deploy with constructor args
forge create src/StrategyComposer.sol:StrategyComposer \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --constructor-args \
    0xEa454f612DCA53492301222e25dd1B2c4CD3c0c0 \
    $AAVE_ADAPTER \
    $UNISWAP_ADAPTER \
    0x0000000000000000000000000000000000000000 \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Save the address
COMPOSER=<address_from_output>
```

### Step 4: Deploy Rebalance Optimizer

```bash
forge create src/RebalanceOptimizer.sol:RebalanceOptimizer \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --constructor-args 0xEa454f612DCA53492301222e25dd1B2c4CD3c0c0 \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Save the address
OPTIMIZER=<address_from_output>
```

### Step 5: Configure CoreVault

```bash
VAULT=0xEa454f612DCA53492301222e25dd1B2c4CD3c0c0

# Approve Aave adapter
cast send $VAULT \
  "setAdapterApproval(address,bool)" \
  $AAVE_ADAPTER \
  true \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY

# Approve Uniswap adapter
cast send $VAULT \
  "setAdapterApproval(address,bool)" \
  $UNISWAP_ADAPTER \
  true \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY

# Verify approvals
cast call $VAULT "approvedAdapters(address)(bool)" $AAVE_ADAPTER --rpc-url $SEPOLIA_RPC_URL
cast call $VAULT "approvedAdapters(address)(bool)" $UNISWAP_ADAPTER --rpc-url $SEPOLIA_RPC_URL
```

### Step 6: Update Frontend Configuration

Create/update `.env` in the frontend:

```bash
cd /Users/rahilbhavan/Quantum_Matrix

cat > .env << EOF
# Existing variables
VITE_CORE_VAULT_SEPOLIA=0xEa454f612DCA53492301222e25dd1B2c4CD3c0c0
VITE_MOCK_USDC_SEPOLIA=0x08009c047eA5a848997885d69E0352faab9B5Ee3

# New adapter addresses
VITE_AAVE_ADAPTER_SEPOLIA=$AAVE_ADAPTER
VITE_UNISWAP_ADAPTER_SEPOLIA=$UNISWAP_ADAPTER
VITE_STRATEGY_COMPOSER_SEPOLIA=$COMPOSER
VITE_REBALANCE_OPTIMIZER_SEPOLIA=$OPTIMIZER
EOF
```

---

## Testing Guide

### Test 1: Template Application

1. **Navigate to Strategy Page**:
   ```
   http://localhost:5173/strategy
   ```

2. **Connect Wallet**:
   - Click "Connect Wallet"
   - Select MetaMask
   - Switch to Sepolia network

3. **Apply Conservative Template**:
   - Click on "Conservative Yield" card
   - Approve transaction in MetaMask
   - Wait for confirmation
   - Verify success message

4. **Verify on Etherscan**:
   ```bash
   # Check user's layers
   cast call $VAULT \
     "getUserLayers(address,address)" \
     <YOUR_ADDRESS> \
     0x08009c047eA5a848997885d69E0352faab9B5Ee3 \
     --rpc-url $SEPOLIA_RPC_URL
   ```

### Test 2: Custom Strategy Builder

1. **Switch to Custom Builder**:
   - Click "Custom Builder" tab

2. **Add Aave Layer**:
   - Click "Add Layer"
   - Select "Aave V3 Lending"
   - Adjust weight to 60%
   - Set condition to "Always"

3. **Add Uniswap Layer**:
   - Click "Add Layer"
   - Select "Uniswap V3 Liquidity"
   - Weight auto-adjusts to 40%
   - Set condition to "Bullish"

4. **Review Metrics**:
   - Check total weight = 100%
   - Check weighted APY
   - Check risk score

5. **Save Strategy**:
   - Click "Save Strategy"
   - Approve 2 transactions (one per layer)
   - Wait for confirmations

### Test 3: Deposit & Rebalance

1. **Get Test USDC**:
   ```bash
   # Mint test USDC (if you're the owner)
   cast send 0x08009c047eA5a848997885d69E0352faab9B5Ee3 \
     "mint(address,uint256)" \
     <YOUR_ADDRESS> \
     1000000000 \
     --rpc-url $SEPOLIA_RPC_URL \
     --private-key $DEPLOYER_PRIVATE_KEY
   ```

2. **Approve USDC**:
   ```bash
   cast send 0x08009c047eA5a848997885d69E0352faab9B5Ee3 \
     "approve(address,uint256)" \
     $VAULT \
     1000000000 \
     --rpc-url $SEPOLIA_RPC_URL \
     --private-key <YOUR_PRIVATE_KEY>
   ```

3. **Deposit to Vault**:
   ```bash
   cast send $VAULT \
     "deposit(address,uint256)" \
     0x08009c047eA5a848997885d69E0352faab9B5Ee3 \
     1000000000 \
     --rpc-url $SEPOLIA_RPC_URL \
     --private-key <YOUR_PRIVATE_KEY>
   ```

4. **Execute Rebalance** (as keeper):
   ```bash
   cast send $VAULT \
     "executeRebalance(address,address)" \
     <YOUR_ADDRESS> \
     0x08009c047eA5a848997885d69E0352faab9B5Ee3 \
     --rpc-url $SEPOLIA_RPC_URL \
     --private-key $DEPLOYER_PRIVATE_KEY
   ```

5. **Check Balances**:
   ```bash
   # Check Aave adapter balance
   cast call $AAVE_ADAPTER \
     "getBalance(address)(uint256)" \
     <YOUR_ADDRESS> \
     --rpc-url $SEPOLIA_RPC_URL

   # Check Uniswap adapter balance
   cast call $UNISWAP_ADAPTER \
     "getBalance(address)(uint256)" \
     <YOUR_ADDRESS> \
     --rpc-url $SEPOLIA_RPC_URL
   ```

---

## Troubleshooting

### Issue: "Adapter not approved"

**Solution**:
```bash
cast send $VAULT \
  "setAdapterApproval(address,bool)" \
  <ADAPTER_ADDRESS> \
  true \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### Issue: "Insufficient balance"

**Solution**: Get test USDC from faucet or mint if you're owner

### Issue: Frontend not connecting to wallet

**Solution**:
1. Check MetaMask is on Sepolia
2. Refresh page
3. Clear browser cache
4. Check console for errors

### Issue: Transaction failing

**Solution**:
```bash
# Check gas price
cast gas-price --rpc-url $SEPOLIA_RPC_URL

# Check your ETH balance
cast balance <YOUR_ADDRESS> --rpc-url $SEPOLIA_RPC_URL

# Simulate transaction first
cast call $VAULT "deposit(address,uint256)" ... --rpc-url $SEPOLIA_RPC_URL
```

---

## Verification Checklist

- [ ] Aave adapter deployed and verified on Etherscan
- [ ] Uniswap adapter deployed and verified on Etherscan
- [ ] Strategy Composer deployed and verified
- [ ] Rebalance Optimizer deployed and verified
- [ ] Both adapters approved in CoreVault
- [ ] Frontend .env updated with all addresses
- [ ] Can apply Conservative template
- [ ] Can create custom strategy
- [ ] Can deposit USDC to vault
- [ ] Can execute rebalance
- [ ] Balances update correctly in adapters

---

## Quick Reference

### Contract Addresses

```bash
# Already deployed
CoreVault Proxy: 0xEa454f612DCA53492301222e25dd1B2c4CD3c0c0
Mock USDC: 0x08009c047eA5a848997885d69E0352faab9B5Ee3

# To be deployed
Aave Adapter: <DEPLOY_AND_UPDATE>
Uniswap Adapter: <DEPLOY_AND_UPDATE>
Strategy Composer: <DEPLOY_AND_UPDATE>
Rebalance Optimizer: <DEPLOY_AND_UPDATE>
```

### Useful Commands

```bash
# Check adapter APY
cast call <ADAPTER> "getAPY()(uint256)" --rpc-url $SEPOLIA_RPC_URL

# Check adapter risk score
cast call <ADAPTER> "getRiskScore()(uint8)" --rpc-url $SEPOLIA_RPC_URL

# Check if rebalance needed
cast call $OPTIMIZER \
  "shouldRebalance(address,address,uint8)(bool,string)" \
  <USER> \
  <ASSET> \
  50 \
  --rpc-url $SEPOLIA_RPC_URL

# Get user's strategy layers
cast call $VAULT \
  "getUserLayers(address,address)" \
  <USER> \
  <ASSET> \
  --rpc-url $SEPOLIA_RPC_URL
```

---

## Next Steps After Testing

1. **Fix any bugs found**
2. **Optimize gas costs**
3. **Add more adapters** (GMX on Arbitrum)
4. **Deploy to mainnet** (after audit)
5. **Launch to users**
