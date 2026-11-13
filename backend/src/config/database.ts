import sql from 'mssql';
import { env } from './environment';
import { logger } from '../utils/logger';

const dbConfig: sql.config = {
  server: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  options: {
    encrypt: env.DB_ENCRYPT,
    trustServerCertificate: env.DB_TRUST_CERT,
    enableArithAbort: true,
  },
  pool: {
    min: 0,
    max: 10,
    idleTimeoutMillis: 60000,
    acquireTimeoutMillis: 60000,
    createTimeoutMillis: 60000,
    destroyTimeoutMillis: 10000,
  },
  connectionTimeout: 60000,
  requestTimeout: 60000,
};

let pool: sql.ConnectionPool | null = null;
let connectionPromise: Promise<sql.ConnectionPool> | null = null;

export async function initializeDatabase(): Promise<sql.ConnectionPool> {
  if (pool && pool.connected) {
    return pool;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      logger.info('🔄 Connecting to SQL Server...', { host: env.DB_HOST, database: env.DB_NAME });
      const newPool = new sql.ConnectionPool(dbConfig);

      newPool.on('error', (err: any) => {
        logger.error('SQL Server pool error', { error: err.message });
        const msg = err.message || '';
        if (
          msg.includes('ECONNRESET') ||
          msg.includes('Connection lost') ||
          msg.includes('operation timed out') ||
          msg.includes('TimeoutError') ||
          err.code === 'ECONNRESET'
        ) {
          try {
            newPool.close().catch(() => {});
          } catch (_) {}
          pool = null;
        }
      });

      await newPool.connect();
      pool = newPool;
      logger.info('✅ SQL Server connected successfully', {
        host: env.DB_HOST,
        database: env.DB_NAME,
      });
      return pool;
    } catch (error) {
      pool = null;
      logger.error('❌ Failed to connect to SQL Server', {
        error: (error as Error).message,
        host: env.DB_HOST,
        database: env.DB_NAME,
      });
      throw error;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}

export function getPool(): sql.ConnectionPool {
  if (pool && pool.connected) {
    return pool;
  }

  // Trigger initialization in background if not already connecting
  if (!connectionPromise) {
    initializeDatabase().catch((err) => {
      logger.warn('Background database connect attempt failed', { error: err.message });
    });
  }

  // Return resilient proxy that awaits connection on request execution
  return new Proxy({} as sql.ConnectionPool, {
    get(_target, prop) {
      if (pool && pool.connected) {
        const val = (pool as any)[prop];
        return typeof val === 'function' ? val.bind(pool) : val;
      }

      if (prop === 'request') {
        return (...args: any[]) => {
          const inputs: Array<{ name: string; type?: any; value: any }> = [];
          const outputs: Array<{ name: string; type: any; value: any }> = [];

          const reqProxy: any = {
            input(name: any, typeOrVal: any, val?: any) {
              if (val === undefined) {
                inputs.push({ name, value: typeOrVal });
              } else {
                inputs.push({ name, type: typeOrVal, value: val });
              }
              return reqProxy;
            },
            output(name: any, type: any, val?: any) {
              outputs.push({ name, type, value: val });
              return reqProxy;
            },
            async query(command: string) {
              let activePool = pool && pool.connected ? pool : null;
              if (!activePool) {
                activePool = await initializeDatabase();
              }
              const realReq = activePool.request();
              for (const inp of inputs) {
                if (inp.type !== undefined) realReq.input(inp.name, inp.type, inp.value);
                else realReq.input(inp.name, inp.value);
              }
              for (const out of outputs) {
                realReq.output(out.name, out.type, out.value);
              }
              return realReq.query(command);
            },
            async execute(procedure: string) {
              let activePool = pool && pool.connected ? pool : null;
              if (!activePool) {
                activePool = await initializeDatabase();
              }
              const realReq = activePool.request();
              for (const inp of inputs) {
                if (inp.type !== undefined) realReq.input(inp.name, inp.type, inp.value);
                else realReq.input(inp.name, inp.value);
              }
              for (const out of outputs) {
                realReq.output(out.name, out.type, out.value);
              }
              return realReq.execute(procedure);
            },
            async batch(batchStr: string) {
              let activePool = pool && pool.connected ? pool : null;
              if (!activePool) {
                activePool = await initializeDatabase();
              }
              return activePool.request().batch(batchStr);
            },
          };
          return reqProxy;
        };
      }

      if (pool) {
        const val = (pool as any)[prop];
        return typeof val === 'function' ? val.bind(pool) : val;
      }

      throw new Error(`Database property '${String(prop)}' accessed while disconnected`);
    },
  });
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    try {
      await pool.close();
      pool = null;
      logger.info('SQL Server connection pool closed');
    } catch (error) {
      const err = error as Error;
      logger.error('Error closing SQL Server pool', { error: err.message });
    }
  }
}

export { sql };
