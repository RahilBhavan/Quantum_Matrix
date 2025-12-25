# 🚀 Quantum Matrix: Production Launch Guide

This guide details the final steps to launch "Quantum Matrix" to production within a **$100/month budget**.

## 💰 Budget Breakdown
| Service | Tier | Cost (Est.) |
|---------|------|-------------|
| **Vercel** (Frontend) | Pro (or Hobby) | $20/mo (or $0) |
| **Railway** (Backend) | Developer | ~$5-10/mo |
| **Supabase** (Database) | Pro (or Free) | $25/mo (or $0) |
| **Alchemy** (RPC) | Free Tier | $0 |
| **Gemini** (AI) | Pay-as-you-go | < $5/mo |
| **Total** | | **~$30 - $60 / month** |

---

## 🛠 Pre-Flight Checklist (Completed by Agent)
- ✅ **SSL Support**: Database connection now supports SSL for production (fixed in `backend/src/config/database.ts`).
- ✅ **Environment Config**: Backend validates all required keys on startup.
- ✅ **API Client**: Frontend respects `VITE_API_URL`.

---

## 🚀 Step 1: Database Setup (Supabase)

1. **Create Project**: Go to [Supabase](https://supabase.com/) and create a new project.
2. **Get Credentials**:
   - Go to **Project Settings -> Database**.
   - Copy the `Connection String` (URI). It looks like: `postgres://postgres.[ref]:[password]@aws-0-region.pooler.supabase.com:6543/postgres`.
   - **Important**: Add `?sslmode=require` to the end if not present (though our code handles SSL, this is good practice).

---

## 🚀 Step 2: Backend Deployment (Railway)

We recommend **Railway** for the backend as it's easier to configure than Render for this stack.

1. **Install CLI & Login**:
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Deploy**:
   ```bash
   cd backend
   railway init
   railway up
   ```

3. **Configure Variables** (in Railway Dashboard -> Variables):
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: (Paste your Supabase connection string)
   - `API_SECRET_KEY`: (Generate a random strong string)
   - `CORS_ORIGIN`: `https://your-vercel-app.vercel.app` (You will update this after Frontend deploy)
   - `GEMINI_API_KEY`: (Your Google Gemini Key)
   - `ALCHEMY_API_KEY`: (Your Alchemy Key)

4. **Run Migrations**:
   In Railway Dashboard -> Click your Service -> **Shell (Command)**:
   ```bash
   npm run db:migrate
   ```

5. **Copy Backend URL**: You will need this for the frontend (e.g., `https://backend-production.up.railway.app`).

---

## 🚀 Step 3: Frontend Deployment (Vercel)

1. **Deploy**:
   ```bash
   cd .. # Go back to root
   vercel --prod
   ```

2. **Configure Environment Variables** (Vercel Dashboard):
   - `VITE_API_URL`: (Paste your Railway Backend URL from Step 2)
   - `VITE_CORE_VAULT_SEPOLIA`: `0xEa454f612DCA53492301222e25dd1B2c4CD3c0c0`
   - `VITE_MOCK_USDC_SEPOLIA`: `0x08009c047eA5a848997885d69E0352faab9B5Ee3`
   - (Add other adapter addresses as needed from `deploy-frontend.sh`)

3. **Finalize Backend CORS**:
   - Copy your new Vercel domain (e.g., `https://quantum-matrix.vercel.app`).
   - Go back to **Railway -> Variables**.
   - Update `CORS_ORIGIN` to this domain.
   - Railway will auto-redeploy.

---

## ✅ Verification

1. **Visit Frontend**: Open your Vercel URL.
2. **Check Health**: Open browser console (F12) -> Network. Ensure requests to `/api/health` or `/api/sentiment` are hitting your Railway URL, not localhost.
3. **Test Database**: Create a user or strategy allocation. If it persists after refresh, your Database connection is working.

## 🆘 Troubleshooting
- **Backend Crashing?** Check Railway Logs. Likely a missing Env Var (e.g., `API_SECRET_KEY`).
- **CORS Error?** Ensure `CORS_ORIGIN` in Railway matches your Vercel URL exactly (no trailing slash).
