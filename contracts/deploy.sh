#!/bin/bash

# Quantum Matrix - Quick Deployment Script
# This script deploys all contracts and configures the system

set -e  # Exit on error

echo "🚀 Quantum Matrix Deployment Script"
echo "===================================="
echo ""

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "❌ Error: .env file not found"
    exit 1
fi

# Check prerequisites
echo "📋 Checking prerequisites..."
if [ -z "$SEPOLIA_RPC_URL" ]; then
    echo "❌ SEPOLIA_RPC_URL not set"
    exit 1
fi

if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
    echo "❌ DEPLOYER_PRIVATE_KEY not set"
    exit 1
fi

if [ -z "$ETHERSCAN_API_KEY" ]; then
    echo "⚠️  Warning: ETHERSCAN_API_KEY not set (verification will fail)"
fi

echo "✅ Prerequisites OK"
echo ""

# Deploy Aave Adapter
echo "📦 Deploying Aave V3 Adapter..."
AAVE_OUTPUT=$(forge script script/DeployAaveAdapter.s.sol \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    -vv 2>&1)

AAVE_ADAPTER=$(echo "$AAVE_OUTPUT" | grep -oP 'AaveV3Adapter: \K0x[a-fA-F0-9]{40}' | head -1)

if [ -z "$AAVE_ADAPTER" ]; then
    echo "❌ Failed to deploy Aave Adapter"
    exit 1
fi

echo "✅ Aave Adapter deployed: $AAVE_ADAPTER"
echo ""

# Deploy Uniswap Adapter
echo "📦 Deploying Uniswap V3 Adapter..."
UNISWAP_OUTPUT=$(forge script script/DeployUniswapV3Adapter.s.sol \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY \
    -vv 2>&1)

UNISWAP_ADAPTER=$(echo "$UNISWAP_OUTPUT" | grep -oP 'UniswapV3Adapter: \K0x[a-fA-F0-9]{40}' | head -1)

if [ -z "$UNISWAP_ADAPTER" ]; then
    echo "❌ Failed to deploy Uniswap Adapter"
    exit 1
fi

echo "✅ Uniswap Adapter deployed: $UNISWAP_ADAPTER"
echo ""

# Deploy Strategy Composer
echo "📦 Deploying Strategy Composer..."
VAULT_ADDRESS="0xEa454f612DCA53492301222e25dd1B2c4CD3c0c0"

COMPOSER_OUTPUT=$(forge create src/StrategyComposer.sol:StrategyComposer \
    --rpc-url $SEPOLIA_RPC_URL \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --constructor-args \
        $VAULT_ADDRESS \
        $AAVE_ADAPTER \
        $UNISWAP_ADAPTER \
        0x0000000000000000000000000000000000000000 \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY 2>&1)

COMPOSER=$(echo "$COMPOSER_OUTPUT" | grep -oP 'Deployed to: \K0x[a-fA-F0-9]{40}' | head -1)

if [ -z "$COMPOSER" ]; then
    echo "❌ Failed to deploy Strategy Composer"
    exit 1
fi

echo "✅ Strategy Composer deployed: $COMPOSER"
echo ""

# Deploy Rebalance Optimizer
echo "📦 Deploying Rebalance Optimizer..."
OPTIMIZER_OUTPUT=$(forge create src/RebalanceOptimizer.sol:RebalanceOptimizer \
    --rpc-url $SEPOLIA_RPC_URL \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --constructor-args $VAULT_ADDRESS \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY 2>&1)

OPTIMIZER=$(echo "$OPTIMIZER_OUTPUT" | grep -oP 'Deployed to: \K0x[a-fA-F0-9]{40}' | head -1)

if [ -z "$OPTIMIZER" ]; then
    echo "❌ Failed to deploy Rebalance Optimizer"
    exit 1
fi

echo "✅ Rebalance Optimizer deployed: $OPTIMIZER"
echo ""

# Approve adapters in CoreVault
echo "🔧 Configuring CoreVault..."

echo "  Approving Aave Adapter..."
cast send $VAULT_ADDRESS \
    "setAdapterApproval(address,bool)" \
    $AAVE_ADAPTER \
    true \
    --rpc-url $SEPOLIA_RPC_URL \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --gas-limit 100000 > /dev/null 2>&1

echo "  Approving Uniswap Adapter..."
cast send $VAULT_ADDRESS \
    "setAdapterApproval(address,bool)" \
    $UNISWAP_ADAPTER \
    true \
    --rpc-url $SEPOLIA_RPC_URL \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --gas-limit 100000 > /dev/null 2>&1

echo "✅ CoreVault configured"
echo ""

# Save addresses to file
echo "💾 Saving deployment addresses..."
cat > deployed-addresses.txt << EOF
Deployment Date: $(date)
Network: Sepolia

Core Contracts:
- CoreVault: $VAULT_ADDRESS
- Mock USDC: 0x08009c047eA5a848997885d69E0352faab9B5Ee3

Strategy Adapters:
- Aave V3 Adapter: $AAVE_ADAPTER
- Uniswap V3 Adapter: $UNISWAP_ADAPTER

Strategy Management:
- Strategy Composer: $COMPOSER
- Rebalance Optimizer: $OPTIMIZER

Frontend Environment Variables:
VITE_CORE_VAULT_SEPOLIA=$VAULT_ADDRESS
VITE_MOCK_USDC_SEPOLIA=0x08009c047eA5a848997885d69E0352faab9B5Ee3
VITE_AAVE_ADAPTER_SEPOLIA=$AAVE_ADAPTER
VITE_UNISWAP_ADAPTER_SEPOLIA=$UNISWAP_ADAPTER
VITE_STRATEGY_COMPOSER_SEPOLIA=$COMPOSER
VITE_REBALANCE_OPTIMIZER_SEPOLIA=$OPTIMIZER
EOF

echo "✅ Addresses saved to deployed-addresses.txt"
echo ""

# Update frontend .env
echo "🎨 Updating frontend environment..."
cd ..
cat >> .env << EOF

# Deployed Contracts ($(date +%Y-%m-%d))
VITE_AAVE_ADAPTER_SEPOLIA=$AAVE_ADAPTER
VITE_UNISWAP_ADAPTER_SEPOLIA=$UNISWAP_ADAPTER
VITE_STRATEGY_COMPOSER_SEPOLIA=$COMPOSER
VITE_REBALANCE_OPTIMIZER_SEPOLIA=$OPTIMIZER
EOF

echo "✅ Frontend .env updated"
echo ""

# Summary
echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo "📝 Summary:"
echo "  - Aave V3 Adapter: $AAVE_ADAPTER"
echo "  - Uniswap V3 Adapter: $UNISWAP_ADAPTER"
echo "  - Strategy Composer: $COMPOSER"
echo "  - Rebalance Optimizer: $OPTIMIZER"
echo ""
echo "🔗 Verify on Etherscan:"
echo "  https://sepolia.etherscan.io/address/$AAVE_ADAPTER"
echo "  https://sepolia.etherscan.io/address/$UNISWAP_ADAPTER"
echo "  https://sepolia.etherscan.io/address/$COMPOSER"
echo "  https://sepolia.etherscan.io/address/$OPTIMIZER"
echo ""
echo "📋 Next Steps:"
echo "  1. Verify contracts on Etherscan (if auto-verify failed)"
echo "  2. Test strategy templates in frontend"
echo "  3. Create custom strategies"
echo "  4. Test rebalancing"
echo ""
echo "🚀 Frontend: http://localhost:5173/strategy"
