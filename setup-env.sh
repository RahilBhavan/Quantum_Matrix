#!/bin/bash

# setup-env.sh
# Unified Configuration Manager
# Copies the root .env file to backend and contracts directories

set -e

echo "🔄 Setting up environment configuration..."

if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "⚠️  .env not found. Creating from .env.example..."
        cp .env.example .env
        echo "✅ Created root .env (Please edit it with your real keys!)"
    else
        echo "❌ Error: Neither .env nor .env.example found!"
        exit 1
    fi
fi

# 1. Frontend: Already uses root .env (Vite default)
echo "✅ Frontend configuration ready (.env)"

# 2. Backend: Copy .env
echo "📦 Configuring Backend..."
cp .env backend/.env
echo "✅ Backend .env updated"

# 3. Contracts: Copy .env
echo "⛓️  Configuring Smart Contracts..."
cp .env contracts/.env
echo "✅ Contracts .env updated"

echo ""
echo "🎉 Configuration complete! You can now run:"
echo "   - Frontend: npm run dev"
echo "   - Backend: cd backend && npm run dev"
echo "   - Contracts: cd contracts && forge build"
