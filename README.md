# Quantum Matrix

**A Modular DeFi Portfolio Manager with AI-Driven Multi-Chain Rebalancing.**

## 🚀 Quick Start

### 1. Configuration
We use a unified configuration system. You only need to edit **one file**.

```bash
# 1. Generate the config file
./setup-env.sh

# 2. Edit .env with your keys
nano .env
```

**Key Variables:**
- `GEMINI_API_KEY`: Required for AI Sentiment.
- `VITE_WALLET_CONNECT_PROJECT_ID`: Required for wallet connection.
- `DATABASE_URL`: Postgres connection string (Backend).

### 2. Run Locally

**Frontend (UI):**
```bash
npm install
npm run dev
```
*Opens at http://localhost:3000*

**Backend (API & AI):**
```bash
cd backend
npm install
npm run dev
```
*Runs at http://localhost:3001*

**Smart Contracts:**
```bash
cd contracts
forge build
```

## 📚 Documentation
- [Master Plan](./MASTER_PLAN.md) - Vision & Architecture
- [Production Deployment](./PRODUCTION_DEPLOYMENT.md) - Live Launch Guide