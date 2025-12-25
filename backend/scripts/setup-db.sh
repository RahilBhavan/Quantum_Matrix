#!/bin/bash

# Quantum Matrix Backend - Database Setup Script

echo "🚀 Setting up PostgreSQL database for Quantum Matrix..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install it first:"
    echo "   brew install postgresql@15"
    exit 1
fi

# Database configuration
DB_NAME="quantum_matrix"
DB_USER="postgres"
DB_PASSWORD="postgres"

echo "📦 Creating database: $DB_NAME"

# Create database (ignore error if already exists)
createdb -U $DB_USER $DB_NAME 2>/dev/null || echo "Database already exists"

echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Run migrations: npm run db:migrate"
echo "2. (Optional) Seed data: npm run db:seed"
