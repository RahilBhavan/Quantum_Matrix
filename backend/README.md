# Quantum Matrix Backend

Backend API for Quantum Matrix DeFi Portfolio Manager - A modular portfolio management platform with AI-driven multi-chain rebalancing.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ 
- **PostgreSQL** 15+
- **Redis** 7+

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.development

# Edit .env.development and add your:
# - DATABASE_URL
# - GEMINI_API_KEY (optional, will use fallback if not provided)
# - REDIS_URL

# Set up database
chmod +x scripts/setup-db.sh
./scripts/setup-db.sh

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

The API will be available at `http://localhost:3001`

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration (env, database, redis)
│   ├── db/
│   │   ├── migrations/  # SQL migration files
│   │   └── queries/     # Database query functions
│   ├── services/        # Business logic (Gemini AI, cache)
│   ├── routes/          # API route handlers
│   ├── middleware/      # Express middleware
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── tests/               # Unit and integration tests
└── scripts/             # Setup and utility scripts
```

## 🔌 API Endpoints

### Users
- `POST /api/users` - Create/register user
- `GET /api/users/:address` - Get user profile and stats

### Allocations
- `POST /api/allocations` - Save strategy configuration
- `GET /api/allocations/:address` - Fetch user allocations
- `DELETE /api/allocations/:address/:assetId` - Remove allocation

### Rebalance
- `POST /api/rebalance/simulate` - Simulate rebalance
- `GET /api/rebalance/history/:address` - Get rebalance history

### Sentiment
- `GET /api/sentiment/current` - Get current market sentiment
- `GET /api/sentiment/history` - Get historical sentiment data
- `POST /api/sentiment/recommendation` - Get AI portfolio recommendation

## 🔧 Development

```bash
# Start dev server with hot reload
npm run dev

# Run tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Build for production
npm run build

# Start production server
npm start
```

## 🗄️ Database Schema

### Tables
- **users** - User profiles and metadata
- **allocations** - User strategy configurations
- **rebalance_history** - Historical rebalance records
- **sentiment_history** - Market sentiment tracking

See `src/db/migrations/001_initial_schema.sql` for full schema.

## 🔐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Server port | 3001 |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_URL` | Redis connection string | redis://localhost:6379 |
| `GEMINI_API_KEY` | Google Gemini API key | - |
| `CORS_ORIGIN` | Allowed CORS origin | http://localhost:3000 |

## 📊 Rate Limiting

- **General API**: 100 requests per 15 minutes
- **AI Endpoints**: 10 requests per minute
- **Write Operations**: 20 requests per minute

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test -- --coverage

# Run specific test file
npm run test:unit -- services/gemini.service.test.ts
```

## 🚢 Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Use managed PostgreSQL (Supabase, AWS RDS)
- [ ] Use managed Redis (Redis Cloud, ElastiCache)
- [ ] Set strong `API_SECRET_KEY`
- [ ] Configure proper CORS origins
- [ ] Enable SSL/TLS
- [ ] Set up monitoring (Datadog, Sentry)
- [ ] Configure automated backups

### Recommended Hosting
- **Database**: Supabase or AWS RDS
- **Redis**: Redis Cloud or AWS ElastiCache
- **API**: Railway, Render, or AWS ECS

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.
