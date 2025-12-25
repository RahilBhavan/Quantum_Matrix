import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/logger.js';

// Import routes (we'll create these next)
import userRoutes from './routes/users.routes.js';
import allocationRoutes from './routes/allocations.routes.js';
import rebalanceRoutes from './routes/rebalance.routes.js';
import sentimentRoutes from './routes/sentiment.routes.js';
import walletRoutes from './routes/wallet.routes.js';
import vaultRoutes from './routes/vault.routes.js';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - supports multiple origins and Vercel preview URLs
const allowedOrigins = config.security.corsOrigins;
const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) {
            callback(null, true);
            return;
        }

        // Allow all origins if configured (for development)
        if (config.security.corsAllowAll) {
            callback(null, true);
            return;
        }

        // Check if origin matches allowed list
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        // Allow any Vercel preview URL for this project
        if (origin.match(/^https:\/\/quantum-matrix.*\.vercel\.app$/)) {
            callback(null, true);
            return;
        }

        // Allow the main production domain
        if (origin === 'https://quantummatrix.rahilbhavan.com') {
            callback(null, true);
            return;
        }

        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(requestLogger);

// Rate limiting
app.use('/api/', apiLimiter);

// Health check
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: config.server.env,
    });
});

// API routes
app.use('/api/users', userRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/rebalance', rebalanceRoutes);
app.use('/api/sentiment', sentimentRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/vault', vaultRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Route ${req.method} ${req.url} not found`,
    });
});

// Error handling (must be last)
app.use(errorHandler);

export default app;
