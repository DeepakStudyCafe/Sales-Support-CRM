import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const userId = req.user?.userId;

    logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.socket.remoteAddress,
      userId: userId || 'anonymous',
      statusCode: res.statusCode,
      responseTimeMs: responseTime,
      userAgent: req.headers['user-agent'],
      contentLength: res.getHeader('content-length'),
    });

    // Warn on slow responses (>1000ms)
    if (responseTime > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.originalUrl,
        responseTimeMs: responseTime,
        userId: userId || 'anonymous',
      });
    }
  });

  next();
}
