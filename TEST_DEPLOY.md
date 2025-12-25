# 🧪 Test Deployment Guide

Follow this guide to verify your application is ready for production before pushing to the cloud.

## 1. Environment Check
Run the setup script to ensure all `.env` files are synchronized.
```bash
./setup-env.sh
```
*Verify that `backend/.env` and `contracts/.env` exist and contain your keys.*

## 2. Frontend Build Verification
Test if the React app builds correctly (catches TypeScript errors and bundle issues).

```bash
# In root directory
npm install
npm run build

# Preview the production build locally
npm run preview
```
- Open `http://localhost:4173` (or the port shown).
- **Check:** Does the UI load? Can you navigate tabs? Does the "S³ Sentiment" badge appear in the header?

## 3. Backend Production Simulation
Test the compiled Node.js application.

```bash
# In /backend directory
cd backend
npm install
npm run build

# Start in production mode
npm start
```
- **Check:** Look for "Server running on port 3001" and "PostgreSQL connected".
- **Test API:** Open `http://localhost:3001/health` in your browser. It should return `{"status":"ok"}`.

## 4. End-to-End Test
With both Frontend (Preview) and Backend (Start) running:
1. Open the Frontend (`http://localhost:4173`).
2. Connect your wallet (if using Sepolia testnet).
3. Click "S³ Sentiment" in the header to refresh data.
4. **Success:** If the sentiment updates without network errors, the integration is working.

## 5. Smart Contract Verification (Optional)
If you haven't deployed to Sepolia yet:
```bash
cd contracts
forge test
```
*Ensure all tests pass before deploying real funds.*
