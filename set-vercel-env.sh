#!/bin/bash

# Quick script to set Vercel environment variables

echo "🔧 Setting Vercel Environment Variables"
echo "========================================"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not installed"
    echo "Run: npm install -g vercel"
    exit 1
fi

echo "📝 Setting environment variables..."
echo ""

# Read from deployed-addresses.txt if it exists
if [ -f "contracts/deployed-addresses.txt" ]; then
    source contracts/deployed-addresses.txt 2>/dev/null || true
fi

# Set environment variables
vercel env add VITE_CORE_VAULT_SEPOLIA production << EOF
0xEa454f612DCA53492301222e25dd1B2c4CD3c0c0
EOF

vercel env add VITE_MOCK_USDC_SEPOLIA production << EOF
0x08009c047eA5a848997885d69E0352faab9B5Ee3
EOF

# Prompt for adapter addresses
echo "Enter Aave Adapter address (from deployed-addresses.txt):"
read AAVE_ADAPTER
vercel env add VITE_AAVE_ADAPTER_SEPOLIA production << EOF
$AAVE_ADAPTER
EOF

echo "Enter Uniswap Adapter address:"
read UNISWAP_ADAPTER
vercel env add VITE_UNISWAP_ADAPTER_SEPOLIA production << EOF
$UNISWAP_ADAPTER
EOF

echo "Enter Strategy Composer address:"
read COMPOSER
vercel env add VITE_STRATEGY_COMPOSER_SEPOLIA production << EOF
$COMPOSER
EOF

echo "Enter Rebalance Optimizer address:"
read OPTIMIZER
vercel env add VITE_REBALANCE_OPTIMIZER_SEPOLIA production << EOF
$OPTIMIZER
EOF

echo "Enter Supabase URL:"
read SUPABASE_URL
vercel env add VITE_SUPABASE_URL production << EOF
$SUPABASE_URL
EOF

echo "Enter Supabase Anon Key:"
read SUPABASE_KEY
vercel env add VITE_SUPABASE_ANON_KEY production << EOF
$SUPABASE_KEY
EOF

echo "Enter Alchemy API Key:"
read ALCHEMY_KEY
vercel env add VITE_ALCHEMY_API_KEY production << EOF
$ALCHEMY_KEY
EOF

echo ""
echo "✅ Environment variables set!"
echo ""
echo "🚀 Now redeploy:"
echo "   vercel --prod"
