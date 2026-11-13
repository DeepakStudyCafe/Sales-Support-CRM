"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const database_1 = require("../src/config/database");
const environment_1 = require("../src/config/environment");
const logger_1 = require("../src/utils/logger");
const MIGRATIONS_DIR = path_1.default.join(__dirname, '..', 'migrations');
const SRC_MIGRATIONS_DIR = path_1.default.join(__dirname, '..', 'src', 'migrations');
async function ensureDatabaseExists() {
    const masterConfig = {
        server: environment_1.env.DB_HOST,
        port: environment_1.env.DB_PORT,
        database: 'master',
        user: environment_1.env.DB_USER,
        password: environment_1.env.DB_PASSWORD,
        options: {
            encrypt: environment_1.env.DB_ENCRYPT,
            trustServerCertificate: environment_1.env.DB_TRUST_CERT,
            enableArithAbort: true,
        },
        connectionTimeout: 30000,
        requestTimeout: 30000,
    };
    const pool = new database_1.sql.ConnectionPool(masterConfig);
    await pool.connect();
    const dbName = environment_1.env.DB_NAME;
    const check = await pool.request()
        .input('dbName', database_1.sql.NVarChar, dbName)
        .query('SELECT name FROM sys.databases WHERE name = @dbName');
    if (check.recordset.length === 0) {
        logger_1.logger.info(`Creating database [${dbName}]...`);
        await pool.request().query(`CREATE DATABASE [${dbName}]`);
        logger_1.logger.info(`✅ Database [${dbName}] created successfully!`);
    }
    else {
        logger_1.logger.info(`ℹ️ Database [${dbName}] already exists.`);
    }
    await pool.close();
}
async function runSqlFile(filePath) {
    const content = fs_1.default.readFileSync(filePath, 'utf8');
    const pool = (0, database_1.getPool)();
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
            }
            catch (err) {
                const error = err;
                // Skip duplicate object errors (already created)
                if (error.message.includes('already an object named') ||
                    error.message.includes('Cannot insert duplicate key') ||
                    error.message.includes('Violation of UNIQUE KEY constraint')) {
                    logger_1.logger.warn(`Skipped (already exists): ${error.message.substring(0, 100)}`);
                }
                else {
                    throw error;
                }
            }
        }
    }
}
async function runMigrations() {
    logger_1.logger.info('🔄 Starting database migrations...');
    try {
        await ensureDatabaseExists();
        await (0, database_1.initializeDatabase)();
        const pool = (0, database_1.getPool)();
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
        const result = await pool.request().query('SELECT filename FROM migrations ORDER BY id');
        const executedMigrations = new Set(result.recordset.map((r) => r.filename));
        // Find migration files in both locations
        const migrationDirs = [MIGRATIONS_DIR, SRC_MIGRATIONS_DIR].filter((d) => fs_1.default.existsSync(d));
        const migrationFiles = [];
        for (const dir of migrationDirs) {
            const files = fs_1.default
                .readdirSync(dir)
                .filter((f) => f.endsWith('.sql'))
                .sort()
                .map((f) => path_1.default.join(dir, f));
            migrationFiles.push(...files);
        }
        // Remove duplicates by filename
        const seen = new Set();
        const uniqueMigrations = migrationFiles.filter((f) => {
            const name = path_1.default.basename(f);
            if (seen.has(name))
                return false;
            seen.add(name);
            return true;
        });
        // Ensure migrations run in numerical/lexical order
        uniqueMigrations.sort((a, b) => path_1.default.basename(a).localeCompare(path_1.default.basename(b)));
        for (const filePath of uniqueMigrations) {
            const filename = path_1.default.basename(filePath);
            if (executedMigrations.has(filename)) {
                logger_1.logger.info(`⏭️  Skipped (already run): ${filename}`);
                continue;
            }
            logger_1.logger.info(`▶️  Running migration: ${filename}`);
            await runSqlFile(filePath);
            await pool
                .request()
                .input('filename', database_1.sql.NVarChar, filename)
                .query('INSERT INTO migrations (filename) VALUES (@filename)');
            logger_1.logger.info(`✅ Completed: ${filename}`);
        }
        logger_1.logger.info('✅ All migrations completed successfully');
        process.exit(0);
    }
    catch (error) {
        const err = error;
        logger_1.logger.error('❌ Migration failed', { error: err.message, stack: err.stack });
        process.exit(1);
    }
}
runMigrations();
//# sourceMappingURL=run-migrations.js.map