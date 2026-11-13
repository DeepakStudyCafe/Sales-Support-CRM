import winston from 'winston';
import { env } from '../config/environment';

const IST_OFFSET = 5.5 * 60 * 60 * 1000; // IST = UTC+5:30

function getISTTimestamp(): string {
  const now = new Date(Date.now() + IST_OFFSET);
  return now.toISOString().replace('Z', '+05:30');
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: getISTTimestamp }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: getISTTimestamp }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

const transports: winston.transport[] = [
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: logFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    tailable: true,
  }),
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: logFormat,
    maxsize: 10 * 1024 * 1024,
    maxFiles: 10,
    tailable: true,
  }),
];

if (env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: 'debug',
    })
  );
} else {
  transports.push(
    new winston.transports.Console({
      format: logFormat,
      level: 'info',
    })
  );
}

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  defaultMeta: { service: 'crm-backend' },
  transports,
  exitOnError: false,
});

export function logRequest(
  method: string,
  url: string,
  ip: string,
  userId?: string,
  statusCode?: number,
  responseTime?: number
): void {
  logger.info('HTTP Request', {
    method,
    url,
    ip,
    userId: userId || 'anonymous',
    statusCode,
    responseTimeMs: responseTime,
  });
}

export default logger;
