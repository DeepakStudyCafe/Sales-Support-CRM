import path from 'path';
import fs from 'fs';
import { initializeDatabase, getPool, sql } from '../src/config/database';
import { env } from '../src/config/environment';
import { logger } from '../src/utils/logger';

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const SRC_MIGRATIONS_DIR = path.join(__dirname, '..', 'src', 'migrations');

async function ensureDatabaseExists(): Promise<void> {
  const masterConfig: sql.config = {
    server: env.DB_HOST,
    port: env.DB_PORT,
    database: 'master',
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    options: {
      encrypt: env.DB_ENCRYPT,
      trustServerCertificate: env.DB_TRUST_CERT,
      enableArithAbort: true,
    },
    connectionTimeout: 30000,
    requestTimeout: 30000,
  };

  const pool = new sql.ConnectionPool(masterConfig);
  await pool.connect();
  const dbName = env.DB_NAME;
  const check = await pool.request()
    .input('dbName', sql.NVarChar, dbName)
    .query('SELECT name FROM sys.databases WHERE name = @dbName');
  if (check.recordset.length === 0) {
    logger.info(`Creating database [${dbName}]...`);
    await pool.request().query(`CREATE DATABASE [${dbName}]`);
    logger.info(`✅ Database [${dbName}] created successfully!`);
  } else {
    logger.info(`ℹ️ Database [${dbName}] already exists.`);
  }
  await pool.close();
}

async function runSqlFile(filePath: string): Promise<void> {
  const content = fs.readFileSync(filePath, 'utf8');
  const pool = getPool();

  // Split on GO statements (SQL Server batch separator) or semicolons
  // Filter empty statements
  const statements = content
    .split(/\bGO\b/gi)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    if (statement.trim()) {
      try {
        await pool.request().query(statement);
      } catch (err) {
        const error = err as Error;
        // Skip duplicate object errors (already created)
        if (
          error.message.includes('already an object named') ||
          error.message.includes('Cannot insert duplicate key') ||
          error.message.includes('Violation of UNIQUE KEY constraint')
        ) {
          logger.warn(`Skipped (already exists): ${error.message.substring(0, 100)}`);
        } else {
          throw error;
        }
      }
    }
  }
}

async function runMigrations(): Promise<void> {
  logger.info('🔄 Starting database migrations...');

  try {
    await ensureDatabaseExists();
    await initializeDatabase();
    const pool = getPool();

    // Create migrations tracking table if it doesn't exist
    await pool.request().query(`
      IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'migrations')
      CREATE TABLE migrations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        filename NVARCHAR(255) NOT NULL UNIQUE,
        executed_at DATETIME2 DEFAULT GETUTCDATE()
      )
    `);

    // Get list of already-run migrations
    const result = await pool.request().query<{ filename: string }>(
      'SELECT filename FROM migrations ORDER BY id'
    );
    const executedMigrations = new Set(result.recordset.map((r) => r.filename));

    // Find migration files in both locations
    const migrationDirs = [MIGRATIONS_DIR, SRC_MIGRATIONS_DIR].filter((d) =>
      fs.existsSync(d)
    );

    const migrationFiles: string[] = [];
    for (const dir of migrationDirs) {
      const files = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.sql'))
        .sort()
        .map((f) => path.join(dir, f));
      migrationFiles.push(...files);
    }

    // Remove duplicates by filename
    const seen = new Set<string>();
    const uniqueMigrations = migrationFiles.filter((f) => {
      const name = path.basename(f);
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });

    // Ensure migrations run in numerical/lexical order
    uniqueMigrations.sort((a, b) => path.basename(a).localeCompare(path.basename(b)));

    for (const filePath of uniqueMigrations) {
      const filename = path.basename(filePath);
      if (executedMigrations.has(filename)) {
        logger.info(`⏭️  Skipped (already run): ${filename}`);
        continue;
      }

      logger.info(`▶️  Running migration: ${filename}`);
      await runSqlFile(filePath);

      await pool
        .request()
        .input('filename', sql.NVarChar, filename)
        .query('INSERT INTO migrations (filename) VALUES (@filename)');

      logger.info(`✅ Completed: ${filename}`);
    }

    logger.info('✅ All migrations completed successfully');
    process.exit(0);
  } catch (error) {
    const err = error as Error;
    logger.error('❌ Migration failed', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

runMigrations();

