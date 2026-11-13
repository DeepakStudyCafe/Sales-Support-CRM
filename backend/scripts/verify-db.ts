import { initializeDatabase, getPool, sql } from '../src/config/database';
import { logger } from '../src/utils/logger';

async function verify(): Promise<void> {
  try {
    await initializeDatabase();
    const pool = getPool();

    const tables = await pool.request().query<{ count: number }>('SELECT count(*) as count FROM sys.tables');
    const roles = await pool.request().query<{ name: string }>('SELECT name FROM roles ORDER BY name');
    const permissions = await pool.request().query<{ count: number }>('SELECT count(*) as count FROM permissions');
    const users = await pool.request().query<{ email: string; first_name: string; last_name: string }>('SELECT email, first_name, last_name FROM users');
    const settings = await pool.request().query<{ count: number }>('SELECT count(*) as count FROM settings');
    const sla = await pool.request().query<{ count: number }>('SELECT count(*) as count FROM sla_configurations');
    const sources = await pool.request().query<{ count: number }>('SELECT count(*) as count FROM lead_sources');

    console.log('=== DATABASE VERIFICATION REPORT ===');
    console.log('Total Tables in sales_crm:', tables.recordset[0].count);
    console.log('Roles:', roles.recordset.map(r => r.name).join(', '));
    console.log('Total Permissions Seeded:', permissions.recordset[0].count);
    console.log('Users in Database:', JSON.stringify(users.recordset));
    console.log('Settings Seeded:', settings.recordset[0].count);
    console.log('SLA Policies Seeded:', sla.recordset[0].count);
    console.log('Lead Sources Seeded:', sources.recordset[0].count);

    process.exit(0);
  } catch (err) {
    logger.error('Verification failed', { error: (err as Error).message });
    process.exit(1);
  }
}

verify();

