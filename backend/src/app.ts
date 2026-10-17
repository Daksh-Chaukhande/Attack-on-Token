import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { config } from './config/index.js';
import { requestLogger } from './middlewares/logger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { NotFoundError } from './utils/errors.js';
import { swaggerSpec } from './utils/swaggerSpec.js';

import authRoutes from './routes/authRoutes.js';
import listingRoutes from './routes/listingRoutes.js';
import claimRoutes from './routes/claimRoutes.js';
import pickupRoutes from './routes/pickupRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { getHealth, getReadiness } from './controllers/healthController.js';

export function createApp(): Express {
  const app = express();

  // Trust proxy for Docker / reverse proxies
  app.set('trust proxy', 1);

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows Swagger UI and local development
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: [config.clientOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    })
  );

  // Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Structured Logging and Request ID tracking
  app.use(requestLogger);

  // Global Rate Limiting
  const limiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.',
      },
    },
  });
  app.use('/api/', limiter);

  // API Documentation (Swagger)
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/v1/swagger.json', (req: Request, res: Response) => {
    res.json(swaggerSpec);
  });

  // Health and Readiness
  app.get('/api/v1/health', getHealth);
  app.get('/api/v1/ready', getReadiness);

  // Core API Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/listings', listingRoutes);
  app.use('/api/v1/claims', claimRoutes);
  app.use('/api/v1/pickups', pickupRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/reports', reportRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/dashboard', dashboardRoutes);

  // Also mount listing claims route: POST /api/v1/listings/:id/claims
  // (handled inside listingRoutes or claimRoutes)
  app.use('/api/v1', claimRoutes);

  // 404 Handler
  app.use((req: Request, res: Response, next: NextFunction) => {
    next(new NotFoundError(`Endpoint '${req.method} ${req.originalUrl}' does not exist.`));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
}
