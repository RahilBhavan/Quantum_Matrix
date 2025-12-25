# 🔐 Secrets Management with Doppler

This project uses [Doppler](https://www.doppler.com/) to manage environment variables and secrets securely across development and production environments.

## 🚀 Getting Started

### 1. Install Doppler CLI

**macOS**
```bash
brew install dopplerhq/cli/doppler
```

**Ubuntu / Debian**
```bash
sudo apt-get update && sudo apt-get install -y apt-transport-https ca-certificates curl gnupg
curl -sLf --retry 3 --tlsv1.2 --proto "=https" 'https://packages.doppler.com/public/cli/gpg.DE2A7741A397C129.key' | sudo apt-key add -
echo "deb https://packages.doppler.com/public/cli/deb/debian any-version main" | sudo tee /etc/apt/sources.list.d/doppler-cli.list
sudo apt-get update && sudo apt-get install doppler
```

### 2. Login & Setup

Login to your Doppler account:
```bash
doppler login
```

Select the project configuration (run this in the project root):
```bash
doppler setup
```
Select `quantum-matrix` project and the appropriate config (e.g., `dev`).

## 🛠 Usage

We have added convenience scripts to `package.json` to run commands with Doppler secrets injected.

### Backend

**Run Development Server:**
```bash
cd backend
npm run dev:doppler
```
(This runs `doppler run -- npm run dev`)

**Run Production Build:**
```bash
cd backend
npm run start:doppler
```

### Frontend

**Run Development Server:**
```bash
npm run dev:doppler
```

**Build for Production:**
```bash
npm run build:doppler
```

## 📋 Required Secrets

Ensure the following secrets are defined in your Doppler project:

**Shared / Global**
- `NODE_ENV`

**Backend**
- `DATABASE_URL` (PostgreSQL Connection String)
- `REDIS_URL` (Redis Connection String)
- `GEMINI_API_KEY` (Google Gemini AI)
- `ALCHEMY_API_KEY` (Blockchain Provider)
- `ETHERSCAN_API_KEY` (Contract Verification)
- `YOUTUBE_API_KEY` (Video Sentiment)
- `OPENAI_API_KEY` (Optional - for Whisper)
- `API_SECRET_KEY` (Internal API Security)

**Frontend**
- `VITE_API_URL`
- `VITE_CORE_VAULT_SEPOLIA`
- `VITE_MOCK_USDC_SEPOLIA`
- (And other contract addresses)

## 🔄 CI/CD Integration

For Vercel and Railway deployments, you can integrate Doppler directly:

- **Vercel:** Use the Doppler Vercel Integration to sync secrets automatically.
- **Railway:** Use the Doppler Railway Integration or inject secrets via the Doppler CLI in your build command.
