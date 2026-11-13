import http from 'http';
import { createApp } from './app';
import { env } from './config/environment';
import { initializeDatabase, closeDatabase } from './config/database';
import { initializeSocketServer } from './events/socket.server';
import { initializeQueues } from './jobs/queue.setup';
import { reminderEngine } from './jobs/reminder.job';
import { logger } from './utils/logger';

async function startServer(): Promise<void> {
  try {
    logger.info('🚀 Starting Enterprise Sales & Support CRM Backend...');
    logger.info(`Environment: ${env.NODE_ENV} | Timezone: ${env.TIMEZONE}`);

    // 1. Initialize Database connection
    try {
      await initializeDatabase();
    } catch (dbErr) {
      logger.warn('⚠️ SQL Server connection failed at startup. Will retry on queries.', {
        error: (dbErr as Error).message,
      });
    }

    // 2. Initialize Queues
    initializeQueues();

    // 3. Create Express app & HTTP Server
    const app = createApp();
    const server = http.createServer(app);

    // 4. Initialize Socket.IO
    await initializeSocketServer(server);

    // 5. Start background reminder engine
    reminderEngine.start(60000); // Check every minute

    // 6. Listen on configured port on all network interfaces (0.0.0.0)
    const port = env.PORT;
    server.listen(port, '0.0.0.0', () => {
      logger.info(`✅ Server listening on port ${port} (0.0.0.0)`);
      logger.info(`🌐 Health check: http://localhost:${port}/health`);
      logger.info(`📡 API endpoint: http://localhost:${port}/api/v1`);
    });

    // Graceful shutdown
    const handleShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      reminderEngine.stop();
      server.close(async () => {
        logger.info('HTTP server closed');
        await closeDatabase();
        process.exit(0);
      });

      // Force shutdown after 10s timeout
      setTimeout(() => {
        logger.error('Forced shutdown due to timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));

    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled Rejection detected', {
        error: reason?.message || String(reason),
        stack: reason?.stack,
      });
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception detected', {
        error: error.message,
        stack: error.stack,
      });
      // Do not crash server on intermittent network tarn/mssql pool timeouts
      if (
        error.message?.includes('operation timed out') ||
        error.message?.includes('TimeoutError') ||
        error.message?.includes('ECONNRESET')
      ) {
        logger.warn('Suppressed fatal exit for network pool timeout');
        return;
      }
      process.exit(1);
    });
  } catch (error) {
    logger.error('Fatal error during startup', { error: (error as Error).message, stack: (error as Error).stack });
    process.exit(1);
  }
}

startServer();
