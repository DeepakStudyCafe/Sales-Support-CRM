import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import * as sql from 'mssql';
import { getPool } from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import logger from '../utils/logger';

export class BulkController {
  /**
   * GET /api/v1/bulk/template/:module
   * Generates and downloads a clean, styled Excel template with instructions and sample row.
   */
  async downloadTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { module } = req.params;
      const wb = XLSX.utils.book_new();

      let headers: string[] = [];
      let sampleData: any[] = [];
      let instructions: any[] = [];

      switch (module.toLowerCase()) {
        case 'leads':
          headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Source', 'Status', 'Priority', 'City', 'State', 'Notes'];
          sampleData = [
            {
              'First Name': 'Rohan',
              'Last Name': 'Verma',
              'Email': 'rohan.verma@example.in',
              'Phone': '+919876543210',
              'Company': 'Apex Global Ltd',
              'Source': 'Website',
              'Status': 'New',
              'Priority': 'High',
              'City': 'Mumbai',
              'State': 'Maharashtra',
              'Notes': 'Interested in CRM Enterprise 50-user tier'
            },
            {
              'First Name': 'Pooja',
              'Last Name': 'Rao',
              'Email': 'pooja.rao@innovate.co.in',
              'Phone': '+919812345678',
              'Company': 'Innovate Solutions',
              'Source': 'LinkedIn',
              'Status': 'Qualified',
              'Priority': 'Medium',
              'City': 'Bengaluru',
              'State': 'Karnataka',
              'Notes': 'Needs IVR call center integration'
            }
          ];
          instructions = [
            { Rule: 'First Name', Requirement: 'Required, max 100 characters' },
            { Rule: 'Email', Requirement: 'Optional or valid email format' },
            { Rule: 'Phone', Requirement: 'Required, at least 10 digits with optional country code (+91)' },
            { Rule: 'Status Options', Requirement: 'New, Assigned, Contacted, Interested, Follow-up, Qualified, Converted, Lost' },
            { Rule: 'Priority Options', Requirement: 'Low, Medium, High' }
          ];
          break;

        case 'customers':
          headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Company', 'Address', 'City', 'State', 'Pincode', 'Notes'];
          sampleData = [
            {
              'First Name': 'Kunal',
              'Last Name': 'Kapoor',
              'Email': 'kunal.kapoor@tata.com',
              'Phone': '+919820011223',
              'Company': 'Tata Motors Logistics',
              'Address': 'Bombay House, 24 Homi Mody Street',
              'City': 'Mumbai',
              'State': 'Maharashtra',
              'Pincode': '400001',
              'Notes': 'Tier 1 Customer Account'
            }
          ];
          instructions = [
            { Rule: 'Email', Requirement: 'Required, must be unique across customers' },
            { Rule: 'Company', Requirement: 'Optional but recommended' },
            { Rule: 'Phone', Requirement: 'Required, at least 10 digits' }
          ];
          break;

        case 'tickets':
          headers = ['Title', 'Description', 'Category', 'Priority', 'Status', 'Customer Email'];
          sampleData = [
            {
              'Title': 'IVR Call Recording Delay',
              'Description': 'Recordings take up to 10 minutes to populate in dashboard',
              'Category': 'Technical Issue',
              'Priority': 'High',
              'Status': 'Open',
              'Customer Email': 'procurement@reliance.com'
            }
          ];
          instructions = [
            { Rule: 'Title', Requirement: 'Required, max 200 characters' },
            { Rule: 'Priority', Requirement: 'Low, Medium, High, Critical' },
            { Rule: 'Status', Requirement: 'Open, In Progress, Waiting for Customer, Resolved, Closed' },
            { Rule: 'Category', Requirement: 'Technical Issue, Billing, Feature Request, Account & Access' }
          ];
          break;

        default:
          sendError(res, `Template not supported for module: ${module}`, 400);
          return;
      }

      // Add Data Sheet
      const wsData = XLSX.utils.json_to_sheet(sampleData, { header: headers });
      XLSX.utils.book_append_sheet(wb, wsData, 'Data');

      // Add Instructions Sheet
      const wsInstructions = XLSX.utils.json_to_sheet(instructions);
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${module}_import_template.xlsx"`);
      res.send(buf);
    } catch (err: any) {
      logger.error('Error generating Excel template', { error: err.message });
      sendError(res, 'Failed to generate template: ' + err.message, 500);
    }
  }

  /**
   * POST /api/v1/bulk/import/:module
   * Imports rows from uploaded .xlsx buffer or parsed JSON array.
   * Performs validation, duplicate checks, transaction insert, and returns detailed results.
   */
  async importData(req: Request, res: Response): Promise<void> {
    try {
      const { module } = req.params;
      let rows: any[] = [];

      // Check if file was uploaded via multer or sent in body
      if (req.file) {
        const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = wb.SheetNames[0];
        rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
      } else if (req.body && Array.isArray(req.body.records)) {
        rows = req.body.records;
      } else {
        sendError(res, 'No Excel file or records array provided', 400);
        return;
      }

      if (!rows || rows.length === 0) {
        sendError(res, 'The uploaded file/data contains no rows', 400);
        return;
      }

      const pool = await getPool();
      const currentUserId = req.user?.id || null;
      const errors: Array<{ row: number; field: string; message: string }> = [];
      let importedCount = 0;

      if (module.toLowerCase() === 'leads') {
        // Pre-fetch lead sources
        const srcRes = await pool.request().query('SELECT id, name FROM lead_sources');
        const srcMap = new Map(srcRes.recordset.map((r: any) => [r.name.toLowerCase(), r.id]));
        const defaultSourceId = srcRes.recordset[0]?.id;

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const rowNum = i + 2; // Excel row numbering (1-indexed + header)

          const firstName = (r['First Name'] || r.firstName || r.first_name || '').toString().trim();
          const lastName = (r['Last Name'] || r.lastName || r.last_name || '').toString().trim();
          const email = (r['Email'] || r.email || '').toString().trim();
          const phone = (r['Phone'] || r.phone || '').toString().trim();
          const company = (r['Company'] || r.company || '').toString().trim();
          const sourceName = (r['Source'] || r.source || 'Website').toString().trim();
          const status = (r['Status'] || r.status || 'New').toString().trim();
          const priority = (r['Priority'] || r.priority || 'Medium').toString().trim();
          const city = (r['City'] || r.city || '').toString().trim();
          const state = (r['State'] || r.state || '').toString().trim();
          const notes = (r['Notes'] || r.notes || '').toString().trim();

          if (!firstName) {
            errors.push({ row: rowNum, field: 'First Name', message: 'First name is required' });
            continue;
          }
          if (!phone || phone.length < 8) {
            errors.push({ row: rowNum, field: 'Phone', message: 'Valid phone number is required (min 8 digits)' });
            continue;
          }

          // Check duplicate email if email is provided
          if (email) {
            const dupCheck = await pool.request()
              .input('email', sql.NVarChar, email)
              .query('SELECT TOP 1 id FROM leads WHERE email = @email');
            if (dupCheck.recordset.length > 0) {
              errors.push({ row: rowNum, field: 'Email', message: `Lead with email '${email}' already exists` });
              continue;
            }
          }

          const sourceId = srcMap.get(sourceName.toLowerCase()) || defaultSourceId;

          try {
            await pool.request()
              .input('fn', sql.NVarChar, firstName)
              .input('ln', sql.NVarChar, lastName)
              .input('email', sql.NVarChar, email || null)
              .input('phone', sql.NVarChar, phone)
              .input('comp', sql.NVarChar, company || null)
              .input('src', sql.UniqueIdentifier, sourceId)
              .input('status', sql.NVarChar, status)
              .input('pri', sql.NVarChar, priority)
              .input('stage', sql.NVarChar, status)
              .input('assigned', sql.UniqueIdentifier, currentUserId)
              .input('city', sql.NVarChar, city || null)
              .input('state', sql.NVarChar, state || null)
              .input('notes', sql.NVarChar, notes || null)
              .query(`
                INSERT INTO leads (id, first_name, last_name, email, phone, company, source_id, status, priority, pipeline_stage, assigned_to, city, state, notes, created_at, updated_at)
                VALUES (NEWID(), @fn, @ln, @email, @phone, @comp, @src, @status, @pri, @stage, @assigned, @city, @state, @notes, GETUTCDATE(), GETUTCDATE())
              `);
            importedCount++;
          } catch (insertErr: any) {
            errors.push({ row: rowNum, field: 'Database', message: insertErr.message });
          }
        }
      } else if (module.toLowerCase() === 'customers') {
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const rowNum = i + 2;

          const firstName = (r['First Name'] || r.firstName || r.first_name || '').toString().trim();
          const lastName = (r['Last Name'] || r.lastName || r.last_name || '').toString().trim();
          const email = (r['Email'] || r.email || '').toString().trim();
          const phone = (r['Phone'] || r.phone || '').toString().trim();
          const company = (r['Company'] || r.company || '').toString().trim();
          const address = (r['Address'] || r.address || '').toString().trim();
          const city = (r['City'] || r.city || '').toString().trim();
          const state = (r['State'] || r.state || '').toString().trim();
          const pincode = (r['Pincode'] || r.pincode || '').toString().trim();
          const notes = (r['Notes'] || r.notes || '').toString().trim();

          if (!email) {
            errors.push({ row: rowNum, field: 'Email', message: 'Email is required for customer accounts' });
            continue;
          }
          if (!phone) {
            errors.push({ row: rowNum, field: 'Phone', message: 'Phone number is required' });
            continue;
          }

          const dupCheck = await pool.request()
            .input('email', sql.NVarChar, email)
            .query('SELECT TOP 1 id FROM customers WHERE email = @email');
          if (dupCheck.recordset.length > 0) {
            errors.push({ row: rowNum, field: 'Email', message: `Customer with email '${email}' already exists` });
            continue;
          }

          try {
            await pool.request()
              .input('fn', sql.NVarChar, firstName)
              .input('ln', sql.NVarChar, lastName)
              .input('email', sql.NVarChar, email)
              .input('phone', sql.NVarChar, phone)
              .input('comp', sql.NVarChar, company || null)
              .input('addr', sql.NVarChar, address || null)
              .input('city', sql.NVarChar, city || null)
              .input('state', sql.NVarChar, state || null)
              .input('pin', sql.NVarChar, pincode || null)
              .input('assigned', sql.UniqueIdentifier, currentUserId)
              .input('notes', sql.NVarChar, notes || null)
              .query(`
                INSERT INTO customers (id, first_name, last_name, email, phone, company, address, city, state, pincode, assigned_to, notes, is_active, created_at, updated_at)
                VALUES (NEWID(), @fn, @ln, @email, @phone, @comp, @addr, @city, @state, @pin, @assigned, @notes, 1, GETUTCDATE(), GETUTCDATE())
              `);
            importedCount++;
          } catch (insertErr: any) {
            errors.push({ row: rowNum, field: 'Database', message: insertErr.message });
          }
        }
      } else if (module.toLowerCase() === 'tickets') {
        // Pre-fetch categories
        const catRes = await pool.request().query('SELECT id, name FROM ticket_categories');
        const catMap = new Map(catRes.recordset.map((r: any) => [r.name.toLowerCase(), r.id]));
        const defaultCatId = catRes.recordset[0]?.id;

        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          const rowNum = i + 2;

          const title = (r['Title'] || r.title || '').toString().trim();
          const description = (r['Description'] || r.description || '').toString().trim();
          const category = (r['Category'] || r.category || 'Technical Issue').toString().trim();
          const priority = (r['Priority'] || r.priority || 'Medium').toString().trim();
          const status = (r['Status'] || r.status || 'Open').toString().trim();
          const customerEmail = (r['Customer Email'] || r.customerEmail || '').toString().trim();

          if (!title) {
            errors.push({ row: rowNum, field: 'Title', message: 'Ticket title is required' });
            continue;
          }

          let customerId = null;
          if (customerEmail) {
            const custRes = await pool.request()
              .input('email', sql.NVarChar, customerEmail)
              .query('SELECT TOP 1 id FROM customers WHERE email = @email');
            customerId = custRes.recordset[0]?.id || null;
          }

          const categoryId = catMap.get(category.toLowerCase()) || defaultCatId;
          const ticketNumber = `TICK-${Math.floor(1000 + Math.random() * 9000)}`;

          try {
            await pool.request()
              .input('num', sql.NVarChar, ticketNumber)
              .input('title', sql.NVarChar, title)
              .input('desc', sql.NVarChar, description || null)
              .input('cat', sql.UniqueIdentifier, categoryId)
              .input('pri', sql.NVarChar, priority)
              .input('status', sql.NVarChar, status)
              .input('assigned', sql.UniqueIdentifier, currentUserId)
              .input('cust', sql.UniqueIdentifier, customerId)
              .query(`
                INSERT INTO tickets (id, ticket_number, title, description, category_id, priority, status, assigned_to, customer_id, created_by, created_at, updated_at)
                VALUES (NEWID(), @num, @title, @desc, @cat, @pri, @status, @assigned, @cust, @assigned, GETUTCDATE(), GETUTCDATE())
              `);
            importedCount++;
          } catch (insertErr: any) {
            errors.push({ row: rowNum, field: 'Database', message: insertErr.message });
          }
        }
      } else {
        sendError(res, `Bulk import not supported for module: ${module}`, 400);
        return;
      }

      // Log to audit trail
      if (currentUserId) {
        await pool.request()
          .input('user', sql.UniqueIdentifier, currentUserId)
          .input('action', sql.NVarChar, `${module}.bulk_import`)
          .input('entity', sql.NVarChar, module)
          .input('val', sql.NVarChar, JSON.stringify({ total: rows.length, imported: importedCount, failed: errors.length }))
          .query(`
            INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_values, ip_address, created_at)
            VALUES (NEWID(), @user, @action, @entity, 'bulk', @val, '127.0.0.1', GETUTCDATE())
          `);
      }

      sendSuccess(res, {
        total: rows.length,
        imported: importedCount,
        failed: errors.length,
        errors,
      }, `Successfully imported ${importedCount} of ${rows.length} records.`);
    } catch (err: any) {
      logger.error('Bulk import error', { error: err.message });
      sendError(res, 'Bulk import failed: ' + err.message, 500);
    }
  }

  /**
   * POST /api/v1/bulk/export/:module
   * Generates and returns an Excel file of selected records or filtered dataset.
   */
  async exportData(req: Request, res: Response): Promise<void> {
    try {
      const { module } = req.params;
      const { ids, search, status, priority } = req.body || {};
      const pool = await getPool();

      let query = '';
      const request = pool.request();

      switch (module.toLowerCase()) {
        case 'leads':
          query = `
            SELECT 
              l.id,
              l.first_name AS [First Name],
              l.last_name AS [Last Name],
              l.email AS [Email],
              l.phone AS [Phone],
              l.company AS [Company],
              ls.name AS [Source],
              l.status AS [Status],
              l.priority AS [Priority],
              l.pipeline_stage AS [Stage],
              CONCAT(u.first_name, ' ', u.last_name) AS [Assigned To],
              l.city AS [City],
              l.state AS [State],
              l.notes AS [Notes],
              CONVERT(VARCHAR(19), l.created_at, 120) AS [Created At]
            FROM leads l
            LEFT JOIN lead_sources ls ON l.source_id = ls.id
            LEFT JOIN users u ON l.assigned_to = u.id
            WHERE 1=1
          `;
          if (Array.isArray(ids) && ids.length > 0) {
            query += ` AND l.id IN ('${ids.map(id => id.replace(/'/g, "''")).join("','")}')`;
          }
          if (status) {
            query += ` AND l.status = @status`;
            request.input('status', sql.NVarChar, status);
          }
          if (priority) {
            query += ` AND l.priority = @priority`;
            request.input('priority', sql.NVarChar, priority);
          }
          query += ` ORDER BY l.created_at DESC`;
          break;

        case 'customers':
          query = `
            SELECT 
              c.id,
              c.first_name AS [First Name],
              c.last_name AS [Last Name],
              c.email AS [Email],
              c.phone AS [Phone],
              c.company AS [Company],
              c.address AS [Address],
              c.city AS [City],
              c.state AS [State],
              c.pincode AS [Pincode],
              CONCAT(u.first_name, ' ', u.last_name) AS [Account Manager],
              c.notes AS [Notes],
              CONVERT(VARCHAR(19), c.created_at, 120) AS [Created At]
            FROM customers c
            LEFT JOIN users u ON c.assigned_to = u.id
            WHERE c.is_active = 1
          `;
          if (Array.isArray(ids) && ids.length > 0) {
            query += ` AND c.id IN ('${ids.map(id => id.replace(/'/g, "''")).join("','")}')`;
          }
          query += ` ORDER BY c.created_at DESC`;
          break;

        case 'tickets':
          query = `
            SELECT 
              t.ticket_number AS [Ticket Number],
              t.title AS [Title],
              tc.name AS [Category],
              t.priority AS [Priority],
              t.status AS [Status],
              cust.company AS [Customer],
              cust.email AS [Customer Email],
              CONCAT(u.first_name, ' ', u.last_name) AS [Assigned Agent],
              tm.name AS [Support Team],
              CONVERT(VARCHAR(19), t.created_at, 120) AS [Created At],
              CONVERT(VARCHAR(19), t.resolved_at, 120) AS [Resolved At]
            FROM tickets t
            LEFT JOIN ticket_categories tc ON t.category_id = tc.id
            LEFT JOIN customers cust ON t.customer_id = cust.id
            LEFT JOIN users u ON t.assigned_to = u.id
            LEFT JOIN teams tm ON t.team_id = tm.id
            WHERE 1=1
          `;
          if (Array.isArray(ids) && ids.length > 0) {
            query += ` AND t.id IN ('${ids.map(id => id.replace(/'/g, "''")).join("','")}')`;
          }
          query += ` ORDER BY t.created_at DESC`;
          break;

        case 'opportunities':
          query = `
            SELECT 
              o.title AS [Deal Title],
              c.company AS [Customer / Account],
              o.value AS [Value (INR)],
              o.stage AS [Stage],
              CONVERT(VARCHAR(10), o.expected_close_date, 120) AS [Expected Close Date],
              CONCAT(u.first_name, ' ', u.last_name) AS [Assigned Sales Agent],
              o.description AS [Description]
            FROM opportunities o
            LEFT JOIN customers c ON o.customer_id = c.id
            LEFT JOIN users u ON o.assigned_to = u.id
            WHERE 1=1
          `;
          if (Array.isArray(ids) && ids.length > 0) {
            query += ` AND o.id IN ('${ids.map(id => id.replace(/'/g, "''")).join("','")}')`;
          }
          query += ` ORDER BY o.created_at DESC`;
          break;

        case 'calls':
          query = `
            SELECT 
              c.ivr_call_id AS [Call ID],
              c.direction AS [Direction],
              c.caller_number AS [Caller Number],
              c.customer_number AS [Customer Number],
              c.status AS [Call Status],
              c.duration AS [Duration (s)],
              c.outcome AS [Outcome],
              CONCAT(u.first_name, ' ', u.last_name) AS [Agent],
              c.notes AS [Notes],
              CONVERT(VARCHAR(19), c.initiated_at, 120) AS [Initiated At]
            FROM calls c
            LEFT JOIN users u ON c.assigned_to = u.id
            WHERE 1=1
          `;
          if (Array.isArray(ids) && ids.length > 0) {
            query += ` AND c.id IN ('${ids.map(id => id.replace(/'/g, "''")).join("','")}')`;
          }
          query += ` ORDER BY c.created_at DESC`;
          break;

        case 'follow-ups':
        case 'tasks':
          query = `
            SELECT 
              f.title AS [Task / Reminder],
              f.type AS [Type],
              f.priority AS [Priority],
              f.status AS [Status],
              CONVERT(VARCHAR(19), f.scheduled_at, 120) AS [Scheduled Due At],
              CONCAT(u.first_name, ' ', u.last_name) AS [Assigned To],
              f.description AS [Description]
            FROM follow_ups f
            LEFT JOIN users u ON f.assigned_to = u.id
            WHERE 1=1
          `;
          if (Array.isArray(ids) && ids.length > 0) {
            query += ` AND f.id IN ('${ids.map(id => id.replace(/'/g, "''")).join("','")}')`;
          }
          query += ` ORDER BY f.scheduled_at ASC`;
          break;

        default:
          sendError(res, `Export not supported for module: ${module}`, 400);
          return;
      }

      const dbRes = await request.query(query);
      const rows = dbRes.recordset;

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, module);

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${module}_export_${Date.now()}.xlsx"`);
      res.send(buf);
    } catch (err: any) {
      logger.error('Bulk export error', { error: err.message });
      sendError(res, 'Bulk export failed: ' + err.message, 500);
    }
  }

  /**
   * POST /api/v1/bulk/action
   * Executes module-specific actions on multiple IDs:
   * assign, update status, update priority, delete, escalate, complete.
   */
  async executeBulkAction(req: Request, res: Response): Promise<void> {
    try {
      const { module, action, ids, payload } = req.body;

      if (!module || !action || !Array.isArray(ids) || ids.length === 0) {
        sendError(res, 'module, action, and non-empty ids array are required', 400);
        return;
      }

      const pool = await getPool();
      const currentUserId = req.user?.id || null;
      const cleanIds = ids.map(id => id.replace(/'/g, "''"));
      const inClause = `'${cleanIds.join("','")}'`;

      let affectedCount = 0;

      switch (module.toLowerCase()) {
        case 'leads':
          if (action === 'assign') {
            const { assignedTo } = payload || {};
            if (!assignedTo) { sendError(res, 'assignedTo is required', 400); return; }
            const r = await pool.request()
              .input('assigned', sql.UniqueIdentifier, assignedTo)
              .query(`UPDATE leads SET assigned_to = @assigned, updated_at = GETUTCDATE() WHERE id IN (${inClause})`);
            affectedCount = r.rowsAffected[0];
          } else if (action === 'status') {
            const { status } = payload || {};
            if (!status) { sendError(res, 'status is required', 400); return; }
            const r = await pool.request()
              .input('status', sql.NVarChar, status)
              .query(`UPDATE leads SET status = @status, pipeline_stage = @status, updated_at = GETUTCDATE() WHERE id IN (${inClause})`);
            affectedCount = r.rowsAffected[0];
          } else if (action === 'priority') {
            const { priority } = payload || {};
            if (!priority) { sendError(res, 'priority is required', 400); return; }
            const r = await pool.request()
              .input('pri', sql.NVarChar, priority)
              .query(`UPDATE leads SET priority = @pri, updated_at = GETUTCDATE() WHERE id IN (${inClause})`);
            affectedCount = r.rowsAffected[0];
          } else if (action === 'delete') {
            const r = await pool.request()
              .query(`DELETE FROM leads WHERE id IN (${inClause})`);
            affectedCount = r.rowsAffected[0];
          }
          break;

        case 'customers':
          if (action === 'assign') {
            const { assignedTo } = payload || {};
            if (!assignedTo) { sendError(res, 'assignedTo is required', 400); return; }
            const r = await pool.request()
              .input('assigned', sql.UniqueIdentifier, assignedTo)
              .query(`UPDATE customers SET assigned_to = @assigned, updated_at = GETUTCDATE() WHERE id IN (${inClause})`);
            affectedCount = r.rowsAffected[0];
          } else if (action === 'delete') {
            const r = await pool.request()
              .query(`UPDATE customers SET is_active = 0, updated_at = GETUTCDATE() WHERE id IN (${inClause})`);
            affectedCount = r.rowsAffected[0];
          }
          break;

        case 'tickets':
          if (action === 'assign') {
            const { assignedTo, teamId } = payload || {};
            if (!assignedTo) { sendError(res, 'assignedTo is required', 400); return; }
            let q = `UPDATE tickets SET assigned_to = @assigned, updated_at = GETUTCDATE()`;
            const reqq = pool.request().input('assigned', sql.UniqueIdentifier, assignedTo);
            if (teamId) {
              q += `, team_id = @teamId`;
              reqq.input('teamId', sql.UniqueIdentifier, teamId);
            }
            q += ` WHERE id IN (${inClause})`;
            const r = await reqq.query(q);
            affectedCount = r.rowsAffected[0];
          } else if (action === 'status') {
            const { status } = payload || {};
            if (!status) { sendError(res, 'status is required', 400); return; }
            let extra = '';
            if (status === 'Resolved') extra = ', resolved_at = GETUTCDATE()';
            if (status === 'Closed') extra = ', closed_at = GETUTCDATE()';
            const r = await pool.request()
              .input('status', sql.NVarChar, status)
              .query(`UPDATE tickets SET status = @status ${extra}, updated_at = GETUTCDATE() WHERE id IN (${inClause})`);
            affectedCount = r.rowsAffected[0];
          } else if (action === 'priority') {
            const { priority } = payload || {};
            if (!priority) { sendError(res, 'priority is required', 400); return; }
            const r = await pool.request()
              .input('pri', sql.NVarChar, priority)
              .query(`UPDATE tickets SET priority = @pri, updated_at = GETUTCDATE() WHERE id IN (${inClause})`);
            affectedCount = r.rowsAffected[0];
          } else if (action === 'escalate') {
            const r = await pool.request()
              .query(`UPDATE tickets SET priority = 'Critical', updated_at = GETUTCDATE() WHERE id IN (${inClause})`);
            affectedCount = r.rowsAffected[0];
          }
          break;

        case 'follow-ups':
        case 'tasks':
          if (action === 'assign') {
            const { assignedTo } = payload || {};
            if (!assignedTo) { sendError(res, 'assignedTo is required', 400); return; }
            const r = await pool.request()
              .input('assigned', sql.UniqueIdentifier, assignedTo)
              .query(`UPDATE follow_ups SET assigned_to = @assigned, updated_at = GETUTCDATE() WHERE id IN (${inClause})`);
            affectedCount = r.rowsAffected[0];
          } else if (action === 'complete') {
            const r = await pool.request()
              .input('user', sql.UniqueIdentifier, currentUserId)
              .query(`UPDATE follow_ups SET status = 'Completed', completed_at = GETUTCDATE(), completed_by = @user, updated_at = GETUTCDATE() WHERE id IN (${inClause})`);
            affectedCount = r.rowsAffected[0];
          } else if (action === 'reschedule') {
            const { scheduledAt } = payload || {};
            if (!scheduledAt) { sendError(res, 'scheduledAt is required', 400); return; }
            const r = await pool.request()
              .input('sched', sql.DateTime2, new Date(scheduledAt))
              .query(`UPDATE follow_ups SET scheduled_at = @sched, updated_at = GETUTCDATE() WHERE id IN (${inClause})`);
            affectedCount = r.rowsAffected[0];
          } else if (action === 'delete') {
            const r = await pool.request().query(`DELETE FROM follow_ups WHERE id IN (${inClause})`);
            affectedCount = r.rowsAffected[0];
          }
          break;

        case 'users':
          if (action === 'status') {
            const { isActive } = payload || {};
            const r = await pool.request()
              .input('active', sql.Bit, isActive ? 1 : 0)
              .query(`UPDATE users SET is_active = @active, updated_at = GETUTCDATE() WHERE id IN (${inClause})`);
            affectedCount = r.rowsAffected[0];
          } else if (action === 'department') {
            const { departmentId } = payload || {};
            const r = await pool.request()
              .input('dept', sql.UniqueIdentifier, departmentId)
              .query(`UPDATE users SET department_id = @dept, updated_at = GETUTCDATE() WHERE id IN (${inClause})`);
            affectedCount = r.rowsAffected[0];
          } else if (action === 'team') {
            const { teamId } = payload || {};
            const r = await pool.request()
              .input('team', sql.UniqueIdentifier, teamId)
              .query(`UPDATE users SET team_id = @team, updated_at = GETUTCDATE() WHERE id IN (${inClause})`);
            affectedCount = r.rowsAffected[0];
          }
          break;

        default:
          sendError(res, `Bulk action not supported for module: ${module}`, 400);
          return;
      }

      // Log bulk action audit
      if (currentUserId) {
        await pool.request()
          .input('user', sql.UniqueIdentifier, currentUserId)
          .input('action', sql.NVarChar, `${module}.bulk_${action}`)
          .input('entity', sql.NVarChar, module)
          .input('val', sql.NVarChar, JSON.stringify({ count: affectedCount, payload }))
          .query(`
            INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_values, ip_address, created_at)
            VALUES (NEWID(), @user, @action, @entity, 'bulk_action', @val, '127.0.0.1', GETUTCDATE())
          `);
      }

      sendSuccess(res, { affectedCount }, `Successfully updated ${affectedCount} records.`);
    } catch (err: any) {
      logger.error('Bulk action execution error', { error: err.message });
      sendError(res, 'Bulk action failed: ' + err.message, 500);
    }
  }
}

export const bulkController = new BulkController();

