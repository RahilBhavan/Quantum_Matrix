#!/bin/bash

# Backend Deployment Script (Railway/Render)
# Deploys the Quantum Matrix backend

set -e

echo "🚀 Quantum Matrix Backend Deployment"
echo "====================================="
echo ""

# Detect deployment platform
PLATFORM=${1:-railway}  # Default to Railway, can pass 'render' as argument

if [ "$PLATFORM" = "railway" ]; then
    echo "📦 Deploying to Railway..."
    
    # Check if Railway CLI is installed
    if ! command -v railway &> /dev/null; then
        echo "Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    # Login to Railway (if not already)
    railway login
    
    # Link to project (or create new)
    if [ ! -f "railway.json" ]; then
        echo "🔗 Linking to Railway project..."
        railway link
    fi
    
    # Deploy
    echo "🚀 Deploying..."
    railway up
    
    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "📝 Set environment variables:"
    echo "   railway variables set KEY=VALUE"
    echo ""
    
elif [ "$PLATFORM" = "render" ]; then
    echo "📦 Deploying to Render..."
    
    # Check if render.yaml exists
    if [ ! -f "render.yaml" ]; then
        echo "❌ render.yaml not found"
        echo "Please create render.yaml first"
        exit 1
    fi
    
    echo "✅ render.yaml found"
    echo ""
    echo "📝 Next steps:"
    echo "  1. Push to GitHub:"
    echo "     git add ."
    echo "     git commit -m 'Deploy backend'"
    echo "     git push origin main"
    echo ""
    echo "  2. Connect GitHub repo in Render dashboard"
    echo "  3. Render will auto-deploy on push"
    echo ""
    
else
    echo "❌ Unknown platform: $PLATFORM"
    echo "Usage: ./deploy-backend.sh [railway|render]"
    exit 1
fi

echo "🔗 Environment variables to set:"
echo "  - DATABASE_URL (PostgreSQL)"
echo "  - SUPABASE_URL"
echo "  - SUPABASE_SERVICE_KEY"
echo "  - ALCHEMY_API_KEY"
echo "  - GEMINI_API_KEY"
echo "  - PORT (optional, defaults to 3000)"
