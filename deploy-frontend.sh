#!/bin/bash

# Frontend Deployment Script (Vercel)
# Deploys the Quantum Matrix frontend to Vercel

set -e

echo "🚀 Quantum Matrix Frontend Deployment"
echo "======================================"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

# Build the frontend
echo "🔨 Building frontend..."
npm run build

# Check build output
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "✅ Build successful"
echo ""

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."

# Production deployment
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "  1. Set environment variables in Vercel dashboard:"
echo "     - VITE_CORE_VAULT_SEPOLIA"
echo "     - VITE_MOCK_USDC_SEPOLIA"
echo "     - VITE_AAVE_ADAPTER_SEPOLIA"
echo "     - VITE_UNISWAP_ADAPTER_SEPOLIA"
echo "     - VITE_STRATEGY_COMPOSER_SEPOLIA"
echo "     - VITE_REBALANCE_OPTIMIZER_SEPOLIA"
echo "     - VITE_SUPABASE_URL"
echo "     - VITE_SUPABASE_ANON_KEY"
echo "     - VITE_ALCHEMY_API_KEY"
echo ""
echo "  2. Redeploy after setting env vars:"
echo "     vercel --prod"
echo ""
echo "🔗 Visit your deployment:"
echo "   https://your-project.vercel.app"
