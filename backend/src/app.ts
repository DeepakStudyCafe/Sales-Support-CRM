import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/environment';
import { requestLogger } from './middleware/requestLogger.middleware';
import { globalRateLimit } from './middleware/rateLimiter.middleware';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';
import { logger } from './utils/logger';
import routes from './routes';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  }));

  // CORS - Explicit domain allowance & regex match for automationcafe.in
  const allowedOrigins = new Set([
    'https://crm.automationcafe.in',
    'http://crm.automationcafe.in',
    'https://automationcafe.in',
    'http://localhost:3025',
    'http://localhost:3000',
    env.FRONTEND_URL,
    ...(env.CORS_ALLOWED_ORIGINS ? env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim()) : []),
  ].filter(Boolean).map((o) => o.replace(/\/$/, '')));

  app.use(cors({
    origin: (origin, callback) => {
      // 1. Same-origin / server-to-server / curl without Origin header
      if (!origin) {
        return callback(null, true);
      }

      const cleanOrigin = origin.replace(/\/$/, '');

      // 2. Exact match in allowed origins set
      if (allowedOrigins.has(cleanOrigin)) {
        return callback(null, true);
      }

      // 3. Any automationcafe.in domain or subdomain
      if (/^https?:\/\/([a-zA-Z0-9-]+\.)*automationcafe\.in(:\d+)?$/.test(cleanOrigin)) {
        return callback(null, true);
      }

      // 4. Localhost or private IP testing
      if (/^https?:\/\/(localhost|127\.0\.0\.1|159\.65\.154\.5)(:\d+)?$/.test(cleanOrigin)) {
        return callback(null, true);
      }

      // 5. In non-production, be permissive
      if (env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      // 6. Clean rejection without throwing Error (avoids Express 500 crash)
      logger.warn(`CORS rejected origin: ${cleanOrigin}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Set-Cookie'],
  }));

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Cookie parser lightweight extractor
  app.use((req, _res, next) => {
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      req.cookies = cookieHeader.split(';').reduce((acc, str) => {
        const [k, v] = str.split('=').map((s) => s.trim());
        if (k && v) acc[k] = decodeURIComponent(v);
        return acc;
      }, {} as Record<string, string>);
    } else {
      req.cookies = {};
    }
    next();
  });

  // Request logger
  app.use(requestLogger);

  // Global rate limiter
  app.use('/api/', globalRateLimit);

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'Sales & Support CRM API',
      version: '1.0.0',
    });
  });

  // API v1 Routes
  app.use('/api/v1', routes);

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}
