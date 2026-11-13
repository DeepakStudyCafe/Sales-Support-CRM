import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/environment';
import { requestLogger } from './middleware/requestLogger.middleware';
import { globalRateLimit } from './middleware/rateLimiter.middleware';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';
import routes from './routes';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  }));

  // CORS
  app.use(cors({
    origin: [env.FRONTEND_URL, 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
