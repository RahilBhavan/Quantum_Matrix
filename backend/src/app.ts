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

const app = express();

// Security middleware
app.use(helmet());
app.use(
    cors({
        origin: config.security.corsOrigin,
        credentials: true,
    })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(requestLogger);

// Rate limiting
app.use('/api/', apiLimiter);

// Health check
app.get('/health', (req, res) => {
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
