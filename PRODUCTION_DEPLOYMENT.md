# Quantum Matrix - Production Deployment Guide

## Overview

This guide covers deploying the Quantum Matrix platform to production:
- **Frontend**: Vercel
- **Backend**: Railway or Render
- **Database**: Supabase (already configured)
- **Smart Contracts**: Sepolia testnet (or mainnet)

---

## Frontend Deployment (Vercel)

### Quick Deploy

```bash
cd /Users/rahilbhavan/Quantum_Matrix
./deploy-frontend.sh
```

### Manual Steps

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Set Environment Variables** in Vercel Dashboard:
   - `VITE_CORE_VAULT_SEPOLIA`
   - `VITE_MOCK_USDC_SEPOLIA`
   - `VITE_AAVE_ADAPTER_SEPOLIA`
   - `VITE_UNISWAP_ADAPTER_SEPOLIA`
   - `VITE_STRATEGY_COMPOSER_SEPOLIA`
   - `VITE_REBALANCE_OPTIMIZER_SEPOLIA`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ALCHEMY_API_KEY`

5. **Redeploy** after setting env vars:
   ```bash
   vercel --prod
   ```

### Custom Domain

1. Go to Vercel Dashboard → Project → Settings → Domains
2. Add your domain (e.g., `app.quantummatrix.io`)
3. Configure DNS records as shown
4. Wait for SSL certificate

---

## Backend Deployment

### Option 1: Railway (Recommended)

**Quick Deploy**:
```bash
cd /Users/rahilbhavan/Quantum_Matrix/backend
./deploy-backend.sh railway
```

**Manual Steps**:

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login**:
   ```bash
   railway login
   ```

3. **Create Project**:
   ```bash
   railway init
   ```

4. **Add PostgreSQL**:
   ```bash
   railway add
   # Select PostgreSQL
   ```

5. **Set Environment Variables**:
   ```bash
   railway variables set SUPABASE_URL=<your-url>
   railway variables set SUPABASE_SERVICE_KEY=<your-key>
   railway variables set ALCHEMY_API_KEY=<your-key>
   railway variables set GEMINI_API_KEY=<your-key>
   ```

6. **Deploy**:
   ```bash
   railway up
   ```

7. **Get URL**:
   ```bash
   railway domain
   ```

### Option 2: Render

**Quick Deploy**:
```bash
cd /Users/rahilbhavan/Quantum_Matrix/backend
./deploy-backend.sh render
```

**Manual Steps**:

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Deploy backend"
   git push origin main
   ```

2. **Create Web Service** in Render Dashboard:
   - Connect GitHub repository
   - Select `backend` directory
   - Build command: `npm install && npm run build`
   - Start command: `npm start`

3. **Add PostgreSQL Database**:
   - Create new PostgreSQL database
   - Copy `DATABASE_URL`

4. **Set Environment Variables**:
   - `DATABASE_URL` (from PostgreSQL)
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `ALCHEMY_API_KEY`
   - `GEMINI_API_KEY`
   - `PORT=3000`

5. **Deploy**: Automatic on push

---

## Database Setup

### Supabase (Already Configured)

Your Supabase instance is already set up. Just ensure:

1. **Tables exist**:
   - `apy_history`
   - `rebalance_events`
   - `bot_heartbeat`
   - `price_history`

2. **RLS policies** are configured

3. **API keys** are set in environment variables

### PostgreSQL (for Railway/Render)

If using Railway/Render PostgreSQL:

```bash
# Run migrations
npm run db:migrate

# Seed data (optional)
npm run db:seed
```

---

## Smart Contracts

### Already Deployed (Sepolia)

Your contracts are deployed to Sepolia:
- CoreVault: `0xEa454f612DCA53492301222e25dd1B2c4CD3c0c0`
- Mock USDC: `0x08009c047eA5a848997885d69E0352faab9B5Ee3`
- Aave Adapter: (from deploy.sh)
- Uniswap Adapter: (from deploy.sh)
- Strategy Composer: (from deploy.sh)
- Rebalance Optimizer: (from deploy.sh)

### Mainnet Deployment (Future)

When ready for mainnet:

1. **Audit contracts** (OpenZeppelin, Trail of Bits, etc.)
2. **Update deployment scripts** to use mainnet RPC
3. **Deploy to Ethereum mainnet**
4. **Update frontend** to use mainnet addresses

---

## CI/CD Setup

### GitHub Actions (Recommended)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: cd backend && npm install
      - run: cd backend && npm run build
      # Railway auto-deploys on push
```

---

## Environment Variables Summary

### Frontend (Vercel)
```
VITE_CORE_VAULT_SEPOLIA=0xEa454f612DCA53492301222e25dd1B2c4CD3c0c0
VITE_MOCK_USDC_SEPOLIA=0x08009c047eA5a848997885d69E0352faab9B5Ee3
VITE_AAVE_ADAPTER_SEPOLIA=<from_deployment>
VITE_UNISWAP_ADAPTER_SEPOLIA=<from_deployment>
VITE_STRATEGY_COMPOSER_SEPOLIA=<from_deployment>
VITE_REBALANCE_OPTIMIZER_SEPOLIA=<from_deployment>
VITE_SUPABASE_URL=<your_supabase_url>
VITE_SUPABASE_ANON_KEY=<your_supabase_anon_key>
VITE_ALCHEMY_API_KEY=<your_alchemy_key>
```

### Backend (Railway/Render)
```
NODE_ENV=production
PORT=3000
DATABASE_URL=<postgresql_url>
SUPABASE_URL=<your_supabase_url>
SUPABASE_SERVICE_KEY=<your_supabase_service_key>
ALCHEMY_API_KEY=<your_alchemy_key>
GEMINI_API_KEY=<your_gemini_key>
```

---

## Health Checks

### Frontend
- URL: `https://your-app.vercel.app`
- Should load without errors
- Check browser console for issues

### Backend
- URL: `https://your-backend.railway.app/health`
- Should return: `{"status":"ok"}`

### Database
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

---

## Monitoring

### Vercel
- Analytics: Built-in
- Logs: Vercel Dashboard → Deployments → Logs

### Railway
- Metrics: Railway Dashboard → Metrics
- Logs: Railway Dashboard → Logs

### Supabase
- Database: Supabase Dashboard → Database → Logs
- API: Supabase Dashboard → API → Logs

---

## Troubleshooting

### Frontend Build Fails
```bash
# Check build locally
npm run build

# Check for TypeScript errors
npm run type-check
```

### Backend Won't Start
```bash
# Check logs
railway logs

# Test locally
npm run dev
```

### Database Connection Issues
```bash
# Verify DATABASE_URL
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL
```

---

## Rollback

### Vercel
```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback <deployment-url>
```

### Railway
- Railway Dashboard → Deployments → Select previous → Redeploy

---

## Cost Estimates

### Free Tier (Development)
- **Vercel**: Free (Hobby plan)
- **Railway**: $5/month (500 hours)
- **Supabase**: Free (up to 500MB)
- **Total**: ~$5/month

### Production (Paid)
- **Vercel Pro**: $20/month
- **Railway Pro**: $20/month
- **Supabase Pro**: $25/month
- **Total**: ~$65/month

---

## Next Steps

1. ✅ Deploy frontend to Vercel
2. ✅ Deploy backend to Railway/Render
3. ✅ Configure environment variables
4. ✅ Test production deployment
5. ✅ Set up custom domain
6. ✅ Configure CI/CD
7. ✅ Monitor and optimize
