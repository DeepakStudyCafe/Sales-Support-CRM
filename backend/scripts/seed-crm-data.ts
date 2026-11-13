import bcrypt from 'bcryptjs';
import { initializeDatabase, sql } from '../src/config/database';
import { logger } from '../src/utils/logger';

async function queryWithRetry(sqlQuery: string, inputs: Array<{ name: string; type?: any; value: any }> = []): Promise<any> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const pool = await initializeDatabase();
      const req = pool.request();
      for (const inp of inputs) {
        if (inp.type !== undefined) req.input(inp.name, inp.type, inp.value);
        else req.input(inp.name, inp.value);
      }
      return await req.query(sqlQuery);
    } catch (err: any) {
      logger.warn(`Query attempt ${attempt} failed: ${err.message}. Retrying...`);
      if (attempt === 4) throw err;
      await new Promise(r => setTimeout(r, 2500));
    }
  }
}

export async function runComprehensiveSeed(): Promise<void> {
  logger.info('🌱 Starting comprehensive database seeding for all CRM modules...');

  try {
    // -------------------------------------------------------------
    // 1. PASSWORDS & ROLES
    // -------------------------------------------------------------
    logger.info('Step 1: Synchronizing admin passwords & roles...');
    const adminHash = await bcrypt.hash('Admin@123456', 10);
    const salesHash = await bcrypt.hash('Sales@123456', 10);
    const supportHash = await bcrypt.hash('Support@123456', 10);

    await queryWithRetry(`
      UPDATE users 
      SET password_hash = @hash, is_active = 1 
      WHERE email = 'admin@crm.com'
    `, [{ name: 'hash', type: sql.NVarChar, value: adminHash }]);

    const rolesResult = await queryWithRetry('SELECT id, name FROM roles');
    const roleMap = new Map(rolesResult.recordset.map((r: any) => [r.name, r.id]));
    const superAdminRoleId = roleMap.get('Super Admin');
    const adminRoleId = roleMap.get('Admin');
    const salesRoleId = roleMap.get('Sales');
    const supportRoleId = roleMap.get('Support');

    // -------------------------------------------------------------
    // 2. DEPARTMENTS & TEAMS (At least 5 departments & 5 teams)
    // -------------------------------------------------------------
    logger.info('Step 2: Seeding 5 Departments & 5 Teams...');
    await queryWithRetry(`
      IF NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Sales')
        INSERT INTO departments (id, name, description) VALUES (NEWID(), 'Sales', 'Enterprise and outbound sales department');
      IF NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Customer Support')
        INSERT INTO departments (id, name, description) VALUES (NEWID(), 'Customer Support', 'Customer care, SLA, and ticket resolution');
      IF NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Operations & Delivery')
        INSERT INTO departments (id, name, description) VALUES (NEWID(), 'Operations & Delivery', 'Implementation, deployment, and onboarding');
      IF NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Finance & Billing')
        INSERT INTO departments (id, name, description) VALUES (NEWID(), 'Finance & Billing', 'Commercial contracts, GST invoices, and accounts');
      IF NOT EXISTS (SELECT 1 FROM departments WHERE name = 'Management & Administration')
        INSERT INTO departments (id, name, description) VALUES (NEWID(), 'Management & Administration', 'Executive strategy and system administration');
    `);

    const salesDept = (await queryWithRetry("SELECT id FROM departments WHERE name = 'Sales'")).recordset[0].id;
    const supportDept = (await queryWithRetry("SELECT id FROM departments WHERE name = 'Customer Support'")).recordset[0].id;
    const opsDept = (await queryWithRetry("SELECT id FROM departments WHERE name = 'Operations & Delivery'")).recordset[0].id;
    const mgmtDept = (await queryWithRetry("SELECT id FROM departments WHERE name = 'Management & Administration'")).recordset[0].id;

    await queryWithRetry(`
      IF NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Enterprise Sales')
        INSERT INTO teams (id, name, description, department_id) VALUES (NEWID(), 'Enterprise Sales', 'Handling Tier-1 enterprise accounts', @salesDept);
      IF NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Outbound Telesales')
        INSERT INTO teams (id, name, description, department_id) VALUES (NEWID(), 'Outbound Telesales', 'Inside sales and calling campaigns', @salesDept);
      IF NOT EXISTS (SELECT 1 FROM teams WHERE name = 'L1 Inbound Support')
        INSERT INTO teams (id, name, description, department_id) VALUES (NEWID(), 'L1 Inbound Support', 'First-line phone and email customer care', @supportDept);
      IF NOT EXISTS (SELECT 1 FROM teams WHERE name = 'L2 Technical Escalations')
        INSERT INTO teams (id, name, description, department_id) VALUES (NEWID(), 'L2 Technical Escalations', 'Complex technical issue resolution and debugging', @supportDept);
      IF NOT EXISTS (SELECT 1 FROM teams WHERE name = 'Key Accounts Management')
        INSERT INTO teams (id, name, description, department_id) VALUES (NEWID(), 'Key Accounts Management', 'Strategic onboarding and retention', @opsDept);
    `, [
      { name: 'salesDept', type: sql.UniqueIdentifier, value: salesDept },
      { name: 'supportDept', type: sql.UniqueIdentifier, value: supportDept },
      { name: 'opsDept', type: sql.UniqueIdentifier, value: opsDept },
    ]);

    const enterpriseTeamId = (await queryWithRetry("SELECT id FROM teams WHERE name = 'Enterprise Sales'")).recordset[0].id;
    const telesalesTeamId = (await queryWithRetry("SELECT id FROM teams WHERE name = 'Outbound Telesales'")).recordset[0].id;
    const l1SupportTeamId = (await queryWithRetry("SELECT id FROM teams WHERE name = 'L1 Inbound Support'")).recordset[0].id;
    const l2SupportTeamId = (await queryWithRetry("SELECT id FROM teams WHERE name = 'L2 Technical Escalations'")).recordset[0].id;
    const keyAccountsTeamId = (await queryWithRetry("SELECT id FROM teams WHERE name = 'Key Accounts Management'")).recordset[0].id;

    // -------------------------------------------------------------
    // 3. ROLE PERMISSIONS
    // -------------------------------------------------------------
    logger.info('Step 3: Mapping role permissions...');
    await queryWithRetry(`
      INSERT INTO role_permissions (role_id, permission_id, granted)
      SELECT @adminRoleId, id, 1 
      FROM permissions p
      WHERE NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = @adminRoleId AND rp.permission_id = p.id);

      INSERT INTO role_permissions (role_id, permission_id, granted)
      SELECT @salesRoleId, id, 1 
      FROM permissions p
      WHERE p.module IN ('dashboard', 'leads', 'customers', 'opportunities', 'quotations', 'calling', 'followups', 'reports')
        AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = @salesRoleId AND rp.permission_id = p.id);

      INSERT INTO role_permissions (role_id, permission_id, granted)
      SELECT @supportRoleId, id, 1 
      FROM permissions p
      WHERE p.module IN ('dashboard', 'customers', 'tickets', 'calling', 'followups', 'reports')
        AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.role_id = @supportRoleId AND rp.permission_id = p.id);
    `, [
      { name: 'adminRoleId', type: sql.UniqueIdentifier, value: adminRoleId },
      { name: 'salesRoleId', type: sql.UniqueIdentifier, value: salesRoleId },
      { name: 'supportRoleId', type: sql.UniqueIdentifier, value: supportRoleId },
    ]);

    // -------------------------------------------------------------
    // 4. USERS (At least 8 users across Admin, Sales, Support)
    // -------------------------------------------------------------
    logger.info('Step 4: Seeding 8 Sample Users with IVR extensions...');
    const usersToSeed = [
      { email: 'admin.user@crm.com', phone: '+919876543210', hash: adminHash, firstName: 'Operations', lastName: 'Admin', roleId: adminRoleId, teamId: keyAccountsTeamId, deptId: mgmtDept, ext: '100' },
      { email: 'sunita.deshmukh@crm.com', phone: '+919876543215', hash: adminHash, firstName: 'Sunita', lastName: 'Deshmukh', roleId: adminRoleId, teamId: keyAccountsTeamId, deptId: mgmtDept, ext: '109' },
      { email: 'sales@crm.com', phone: '+919876543211', hash: salesHash, firstName: 'Rahul', lastName: 'Sharma', roleId: salesRoleId, teamId: enterpriseTeamId, deptId: salesDept, ext: '101' },
      { email: 'amit.patel@crm.com', phone: '+919876543213', hash: salesHash, firstName: 'Amit', lastName: 'Patel', roleId: salesRoleId, teamId: telesalesTeamId, deptId: salesDept, ext: '103' },
      { email: 'kavita.rao@crm.com', phone: '+919876543217', hash: salesHash, firstName: 'Kavita', lastName: 'Rao', roleId: salesRoleId, teamId: enterpriseTeamId, deptId: salesDept, ext: '105' },
      { email: 'support@crm.com', phone: '+919876543212', hash: supportHash, firstName: 'Priya', lastName: 'Verma', roleId: supportRoleId, teamId: l1SupportTeamId, deptId: supportDept, ext: '102' },
      { email: 'arjun.singh@crm.com', phone: '+919876543214', hash: supportHash, firstName: 'Arjun', lastName: 'Singh', roleId: supportRoleId, teamId: l2SupportTeamId, deptId: supportDept, ext: '104' },
      { email: 'deepa.nair@crm.com', phone: '+919876543216', hash: supportHash, firstName: 'Deepa', lastName: 'Nair', roleId: supportRoleId, teamId: l1SupportTeamId, deptId: supportDept, ext: '106' },
    ];

    for (const u of usersToSeed) {
      await queryWithRetry(`
        IF NOT EXISTS (SELECT 1 FROM users WHERE email = @email)
          INSERT INTO users (id, email, phone, password_hash, first_name, last_name, role_id, team_id, department_id, ivr_extension, is_active, timezone)
          VALUES (NEWID(), @email, @phone, @hash, @firstName, @lastName, @roleId, @teamId, @deptId, @ext, 1, 'Asia/Kolkata');
      `, [
        { name: 'email', type: sql.NVarChar, value: u.email },
        { name: 'phone', type: sql.NVarChar, value: u.phone },
        { name: 'hash', type: sql.NVarChar, value: u.hash },
        { name: 'firstName', type: sql.NVarChar, value: u.firstName },
        { name: 'lastName', type: sql.NVarChar, value: u.lastName },
        { name: 'roleId', type: sql.UniqueIdentifier, value: u.roleId },
        { name: 'teamId', type: sql.UniqueIdentifier, value: u.teamId },
        { name: 'deptId', type: sql.UniqueIdentifier, value: u.deptId },
        { name: 'ext', type: sql.NVarChar, value: u.ext },
      ]);

      const userRec = (await queryWithRetry("SELECT id FROM users WHERE email = @e", [{ name: 'e', type: sql.NVarChar, value: u.email }])).recordset[0];
      if (userRec) {
        await queryWithRetry(`
          IF NOT EXISTS (SELECT 1 FROM ivr_agents WHERE user_id = @userId)
            INSERT INTO ivr_agents (id, user_id, agent_id, extension, did_number, is_active)
            VALUES (NEWID(), @userId, @agentId, @ext, '+911145678900', 1);
        `, [
          { name: 'userId', type: sql.UniqueIdentifier, value: userRec.id },
          { name: 'agentId', type: sql.NVarChar, value: `AGT-${u.ext}` },
          { name: 'ext', type: sql.NVarChar, value: u.ext },
        ]);
      }
    }

    const superAdmin = (await queryWithRetry("SELECT id FROM users WHERE email = 'admin@crm.com'")).recordset[0].id;
    const salesUser1 = (await queryWithRetry("SELECT id FROM users WHERE email = 'sales@crm.com'")).recordset[0].id;
    const salesUser2 = (await queryWithRetry("SELECT id FROM users WHERE email = 'amit.patel@crm.com'")).recordset[0].id;
    const supportUser1 = (await queryWithRetry("SELECT id FROM users WHERE email = 'support@crm.com'")).recordset[0].id;
    const supportUser2 = (await queryWithRetry("SELECT id FROM users WHERE email = 'arjun.singh@crm.com'")).recordset[0].id;

    // -------------------------------------------------------------
    // 5. LEAD SOURCES
    // -------------------------------------------------------------
    logger.info('Step 5: Verifying lead sources...');
    const sources = ['Website', 'Referral', 'Google Ads', 'LinkedIn', 'Cold Call', 'Trade Show', 'Email Campaign', 'Inbound Phone', 'Channel Partner'];
    for (const s of sources) {
      await queryWithRetry(`
        IF NOT EXISTS (SELECT 1 FROM lead_sources WHERE name = @s)
          INSERT INTO lead_sources (id, name, is_active) VALUES (NEWID(), @s, 1);
      `, [{ name: 's', type: sql.NVarChar, value: s }]);
    }
    const srcMap = new Map((await queryWithRetry('SELECT id, name FROM lead_sources')).recordset.map((r: any) => [r.name, r.id]));

    // -------------------------------------------------------------
    // 6. REALISTIC LEADS (At least 9 Leads across stages)
    // -------------------------------------------------------------
    logger.info('Step 6: Seeding 9 Enterprise Leads...');
    const leadsToSeed = [
      { firstName: 'Vikram', lastName: 'Mehta', email: 'vikram.mehta@tata.com', phone: '+919820011223', company: 'Tata Consultancy Services', source: 'Website', status: 'Qualified', priority: 'High', stage: 'Qualified', assignedTo: salesUser1, city: 'Mumbai', state: 'Maharashtra', notes: 'Interested in CRM enterprise licensing for 50 agents.' },
      { firstName: 'Ananya', lastName: 'Iyer', email: 'ananya.iyer@infosys.com', phone: '+919845012345', company: 'Infosys BPM', source: 'Referral', status: 'Contacted', priority: 'Medium', stage: 'Contacted', assignedTo: salesUser1, city: 'Bengaluru', state: 'Karnataka', notes: 'Requested demo on Click-to-Call telephony integration.' },
      { firstName: 'Rohit', lastName: 'Gupta', email: 'rohit.gupta@zomato.com', phone: '+919910054321', company: 'Zomato Operations', source: 'Google Ads', status: 'Proposal', priority: 'Urgent', stage: 'Proposal', assignedTo: salesUser2, city: 'Gurugram', state: 'Haryana', notes: 'Quotation submitted for ₹8,50,000 annual contract.' },
      { firstName: 'Neha', lastName: 'Singh', email: 'neha.singh@swiggy.in', phone: '+919739098765', company: 'Swiggy Logistics', source: 'Inbound Phone', status: 'New', priority: 'Medium', stage: 'New', assignedTo: salesUser1, city: 'Bengaluru', state: 'Karnataka', notes: 'Inbound website enquiry received.' },
      { firstName: 'Aditya', lastName: 'Birla', email: 'aditya.birla@grasim.com', phone: '+919825012345', company: 'Grasim Industries', source: 'LinkedIn', status: 'Qualified', priority: 'High', stage: 'Qualified', assignedTo: salesUser2, city: 'Ahmedabad', state: 'Gujarat', notes: 'Looking for multi-branch call campaign dialer suite.' },
      { firstName: 'Pooja', lastName: 'Hegde', email: 'pooja.hegde@paytm.com', phone: '+919810099887', company: 'Paytm Payments Bank', source: 'Trade Show', status: 'Contacted', priority: 'Medium', stage: 'Contacted', assignedTo: salesUser1, city: 'Noida', state: 'Uttar Pradesh', notes: 'Met at FinTech India Summit 2026.' },
      { firstName: 'Manish', lastName: 'Malhotra', email: 'manish.m@flipkart.com', phone: '+919880011224', company: 'Flipkart Internet', source: 'Channel Partner', status: 'Proposal', priority: 'Urgent', stage: 'Proposal', assignedTo: salesUser2, city: 'Bengaluru', state: 'Karnataka', notes: 'Large requirements for 120 customer support agents.' },
      { firstName: 'Siddharth', lastName: 'Roy', email: 'siddharth.roy@wipro.com', phone: '+919940022334', company: 'Wipro Digital', source: 'Cold Call', status: 'Lost', priority: 'Low', stage: 'Lost', assignedTo: salesUser1, city: 'Hyderabad', state: 'Telangana', notes: 'Competitor selected due to existing multi-year contract.' },
      { firstName: 'Tanvi', lastName: 'Shah', email: 'tanvi.shah@nykaa.com', phone: '+919820088776', company: 'Nykaa E-Retail', source: 'Email Campaign', status: 'Converted', priority: 'High', stage: 'Converted', assignedTo: salesUser2, city: 'Mumbai', state: 'Maharashtra', notes: 'Converted to active enterprise customer account.' },
    ];

    for (const l of leadsToSeed) {
      const srcId = srcMap.get(l.source) || srcMap.get('Website');
      await queryWithRetry(`
        IF NOT EXISTS (SELECT 1 FROM leads WHERE email = @email)
          INSERT INTO leads (id, first_name, last_name, email, phone, company, source_id, status, priority, pipeline_stage, assigned_to, city, state, notes)
          VALUES (NEWID(), @fn, @ln, @email, @phone, @company, @srcId, @status, @priority, @stage, @assignedTo, @city, @state, @notes);
      `, [
        { name: 'email', type: sql.NVarChar, value: l.email },
        { name: 'fn', type: sql.NVarChar, value: l.firstName },
        { name: 'ln', type: sql.NVarChar, value: l.lastName },
        { name: 'phone', type: sql.NVarChar, value: l.phone },
        { name: 'company', type: sql.NVarChar, value: l.company },
        { name: 'srcId', type: sql.UniqueIdentifier, value: srcId },
        { name: 'status', type: sql.NVarChar, value: l.status },
        { name: 'priority', type: sql.NVarChar, value: l.priority },
        { name: 'stage', type: sql.NVarChar, value: l.stage },
        { name: 'assignedTo', type: sql.UniqueIdentifier, value: l.assignedTo },
        { name: 'city', type: sql.NVarChar, value: l.city },
        { name: 'state', type: sql.NVarChar, value: l.state },
        { name: 'notes', type: sql.NVarChar, value: l.notes },
      ]);
    }

    // -------------------------------------------------------------
    // 7. REALISTIC CUSTOMERS (6 Enterprise Accounts)
    // -------------------------------------------------------------
    logger.info('Step 7: Seeding 6 Enterprise Customers...');
    const customersToSeed = [
      { email: 'procurement@reliance.com', fn: 'Rajesh', ln: 'Ambani', phone: '+919822001100', company: 'Reliance Retail Ltd', addr: 'Maker Chambers IV, Nariman Point', city: 'Mumbai', state: 'Maharashtra', pin: '400021', notes: 'Tier-1 client: 200 IVR extensions, 24/7 dedicated SLA support.' },
      { email: 'support@hdfcbank.com', fn: 'Suresh', ln: 'Nair', phone: '+919821102200', company: 'HDFC Bank Customer Care', addr: 'HDFC Bank House, Senapati Bapat Marg', city: 'Mumbai', state: 'Maharashtra', pin: '400013', notes: 'Key banking client using automated ticket routing and SLA escalations.' },
      { email: 'enterprise@airtel.in', fn: 'Sunil', ln: 'Mittal', phone: '+919810011000', company: 'Bharti Airtel Ltd', addr: 'Airtel Centre, Plot 16, Udyog Vihar Phase IV', city: 'Gurugram', state: 'Haryana', pin: '122015', notes: 'Telephony infrastructure partner and enterprise CRM subscriber.' },
      { email: 'it.admin@mahindra.com', fn: 'Anand', ln: 'Mahindra', phone: '+919820055443', company: 'Mahindra & Mahindra Ltd', addr: 'Mahindra Towers, Worli', city: 'Mumbai', state: 'Maharashtra', pin: '400018', notes: 'Automotive CRM deployment across 85 dealership service hubs.' },
      { email: 'contracts@larsentoubro.com', fn: 'SN', ln: 'Subrahmanyan', phone: '+919820044332', company: 'Larsen & Toubro Ltd', addr: 'L&T House, Ballard Estate', city: 'Mumbai', state: 'Maharashtra', pin: '400001', notes: 'Heavy Engineering & Construction customer service ticketing.' },
      { email: 'care@godrejcp.com', fn: 'Adi', ln: 'Godrej', phone: '+919820033221', company: 'Godrej Consumer Products Ltd', addr: 'Godrej One, Pirojshanagar, Vikhroli East', city: 'Mumbai', state: 'Maharashtra', pin: '400079', notes: 'FMCG distributor support and retail partner telephony.' },
    ];

    for (const c of customersToSeed) {
      await queryWithRetry(`
        IF NOT EXISTS (SELECT 1 FROM customers WHERE email = @email)
          INSERT INTO customers (id, first_name, last_name, email, phone, company, address, city, state, pincode, assigned_to, notes, is_active)
          VALUES (NEWID(), @fn, @ln, @email, @phone, @company, @addr, @city, @state, @pin, @assignedTo, @notes, 1);
      `, [
        { name: 'email', type: sql.NVarChar, value: c.email },
        { name: 'fn', type: sql.NVarChar, value: c.fn },
        { name: 'ln', type: sql.NVarChar, value: c.ln },
        { name: 'phone', type: sql.NVarChar, value: c.phone },
        { name: 'company', type: sql.NVarChar, value: c.company },
        { name: 'addr', type: sql.NVarChar, value: c.addr },
        { name: 'city', type: sql.NVarChar, value: c.city },
        { name: 'state', type: sql.NVarChar, value: c.state },
        { name: 'pin', type: sql.NVarChar, value: c.pin },
        { name: 'notes', type: sql.NVarChar, value: c.notes },
        { name: 'assignedTo', type: sql.UniqueIdentifier, value: salesUser1 },
      ]);
    }

    const customerMap = new Map((await queryWithRetry('SELECT id, email FROM customers')).recordset.map((r: any) => [r.email, r.id]));
    const relCustId = customerMap.get('procurement@reliance.com');
    const hdfcCustId = customerMap.get('support@hdfcbank.com');
    const airtelCustId = customerMap.get('enterprise@airtel.in');
    const mahindraCustId = customerMap.get('it.admin@mahindra.com');
    const ltCustId = customerMap.get('contracts@larsentoubro.com');
    const godrejCustId = customerMap.get('care@godrejcp.com');

    // -------------------------------------------------------------
    // 8. OPPORTUNITIES (6 Deals across stages)
    // -------------------------------------------------------------
    logger.info('Step 8: Seeding 6 Opportunities...');
    const oppsToSeed = [
      { title: 'Annual CRM Enterprise Suite - Reliance', custId: relCustId, val: 1250000.00, stage: 'Negotiation', desc: 'Enterprise license including 100 IVR seats and 24/7 SLA.' },
      { title: 'Telephony & IVR Cloud Migration - HDFC Bank', custId: hdfcCustId, val: 3800000.00, stage: 'Proposal', desc: 'Complete on-premise to cloud telephony bridge migration.' },
      { title: 'Customer Care Dialer Upgrade - Airtel', custId: airtelCustId, val: 2400000.00, stage: 'Discovery', desc: 'High throughput progressive dialer integration.' },
      { title: 'Fleet Logistics Support Suite - Mahindra', custId: mahindraCustId, val: 1650000.00, stage: 'Negotiation', desc: 'Multi-hub ticketing and call dispatch software.' },
      { title: 'Heavy Engineering Helpdesk SLA - L&T', custId: ltCustId, val: 4500000.00, stage: 'Closed Won', desc: 'Multi-year custom SLA enterprise agreement.' },
      { title: 'Omnichannel Retail Pipeline - Godrej', custId: godrejCustId, val: 950000.00, stage: 'Closed Lost', desc: 'Budget postponed to next financial year.' },
    ];

    for (const o of oppsToSeed) {
      if (!o.custId) continue;
      await queryWithRetry(`
        IF NOT EXISTS (SELECT 1 FROM opportunities WHERE title = @title)
          INSERT INTO opportunities (id, customer_id, title, value, currency, stage, expected_close_date, assigned_to, description)
          VALUES (NEWID(), @custId, @title, @val, 'INR', @stage, DATEADD(day, 45, GETUTCDATE()), @assignedTo, @desc);
      `, [
        { name: 'title', type: sql.NVarChar, value: o.title },
        { name: 'custId', type: sql.UniqueIdentifier, value: o.custId },
        { name: 'val', type: sql.Decimal(18, 2), value: o.val },
        { name: 'stage', type: sql.NVarChar, value: o.stage },
        { name: 'desc', type: sql.NVarChar, value: o.desc },
        { name: 'assignedTo', type: sql.UniqueIdentifier, value: salesUser1 },
      ]);
    }

    const oppMap = new Map((await queryWithRetry('SELECT id, title FROM opportunities')).recordset.map((r: any) => [r.title, r.id]));

    // -------------------------------------------------------------
    // 9. QUOTATIONS (6 Official Quotations)
    // -------------------------------------------------------------
    logger.info('Step 9: Seeding 6 Quotations...');
    const quotesToSeed = [
      { quoteNumber: 'QT-2026-001', oppTitle: 'Annual CRM Enterprise Suite - Reliance', custId: relCustId, subtotal: 1250000.00, tax: 225000.00, total: 1475000.00, status: 'Approved', notes: 'Approved with 100 IVR seats license.' },
      { quoteNumber: 'QT-2026-002', oppTitle: 'Telephony & IVR Cloud Migration - HDFC Bank', custId: hdfcCustId, subtotal: 3800000.00, tax: 684000.00, total: 4484000.00, status: 'Sent', notes: 'Proposal delivered, awaiting procurement committee signoff.' },
      { quoteNumber: 'QT-2026-003', oppTitle: 'Customer Care Dialer Upgrade - Airtel', custId: airtelCustId, subtotal: 2400000.00, tax: 432000.00, total: 2832000.00, status: 'Draft', notes: 'Under internal technical sizing review.' },
      { quoteNumber: 'QT-2026-004', oppTitle: 'Fleet Logistics Support Suite - Mahindra', custId: mahindraCustId, subtotal: 1650000.00, tax: 297000.00, total: 1947000.00, status: 'Sent', notes: 'Quotation with 18% GST break-up for Pune division.' },
      { quoteNumber: 'QT-2026-005', oppTitle: 'Heavy Engineering Helpdesk SLA - L&T', custId: ltCustId, subtotal: 4500000.00, tax: 810000.00, total: 5310000.00, status: 'Approved', notes: 'Signed contract po_ref #LT-2026-9902.' },
      { quoteNumber: 'QT-2026-006', oppTitle: 'Omnichannel Retail Pipeline - Godrej', custId: godrejCustId, subtotal: 950000.00, tax: 171000.00, total: 1121000.00, status: 'Expired', notes: 'Expired on 31 Oct 2026.' },
    ];

    for (const q of quotesToSeed) {
      if (!q.custId) continue;
      const oppId = oppMap.get(q.oppTitle);
      const itemsJson = JSON.stringify([
        { item: 'CRM Enterprise License', quantity: 1, rate: q.subtotal * 0.7, amount: q.subtotal * 0.7 },
        { item: 'IVR Telephony Trunk Integration', quantity: 1, rate: q.subtotal * 0.3, amount: q.subtotal * 0.3 },
      ]);

      await queryWithRetry(`
        IF NOT EXISTS (SELECT 1 FROM quotations WHERE quote_number = @qNum)
          INSERT INTO quotations (id, quote_number, opportunity_id, customer_id, items, subtotal, tax_amount, total_value, status, valid_until, notes, created_by)
          VALUES (NEWID(), @qNum, @oppId, @custId, @items, @subtotal, @tax, @total, @status, DATEADD(day, 30, GETUTCDATE()), @notes, @createdBy);
      `, [
        { name: 'qNum', type: sql.NVarChar, value: q.quoteNumber },
        { name: 'oppId', type: sql.UniqueIdentifier, value: oppId || null },
        { name: 'custId', type: sql.UniqueIdentifier, value: q.custId },
        { name: 'items', type: sql.NVarChar, value: itemsJson },
        { name: 'subtotal', type: sql.Decimal(18, 2), value: q.subtotal },
        { name: 'tax', type: sql.Decimal(18, 2), value: q.tax },
        { name: 'total', type: sql.Decimal(18, 2), value: q.total },
        { name: 'status', type: sql.NVarChar, value: q.status },
        { name: 'notes', type: sql.NVarChar, value: q.notes },
        { name: 'createdBy', type: sql.UniqueIdentifier, value: salesUser1 },
      ]);
    }

    // -------------------------------------------------------------
    // 10. CALLS & RECORDINGS (8 Calls)
    // -------------------------------------------------------------
    logger.info('Step 10: Seeding 8 Call records & recordings...');
    const callsToSeed = [
      { ivrCallId: 'CALL-2026-001', caller: '+911145678900', customer: '+919820011223', direction: 'outbound', status: 'answered', duration: 184, outcome: 'Interested', recUrl: 'https://recordings.crm.local/rec-2026-001.mp3', notes: 'Discussed CRM pricing and agent extension rollout.', custId: null },
      { ivrCallId: 'CALL-2026-002', caller: '+919821102200', customer: '+911145678900', direction: 'inbound', status: 'answered', duration: 240, outcome: 'Resolved', recUrl: 'https://recordings.crm.local/rec-2026-002.mp3', notes: 'Customer inquired regarding invoice breakdown. Answered clearly.', custId: hdfcCustId },
      { ivrCallId: 'CALL-2026-003', caller: '+911145678900', customer: '+919910054321', direction: 'outbound', status: 'answered', duration: 310, outcome: 'Proposal', recUrl: 'https://recordings.crm.local/rec-2026-003.mp3', notes: 'Zomato Operations review call.', custId: null },
      { ivrCallId: 'CALL-2026-004', caller: '+919811223344', customer: '+911145678900', direction: 'inbound', status: 'missed', duration: 0, outcome: 'Missed Call', recUrl: null, notes: 'Incoming call rang for 30s but all agents busy.', custId: null },
      { ivrCallId: 'CALL-2026-005', caller: '+919739098765', customer: '+911145678900', direction: 'inbound', status: 'missed', duration: 0, outcome: 'Callback Required', recUrl: null, notes: 'Customer hung up before routing.', custId: null },
      { ivrCallId: 'CALL-2026-006', caller: '+919822001100', customer: '+911145678900', direction: 'inbound', status: 'answered', duration: 420, outcome: 'Converted', recUrl: 'https://recordings.crm.local/rec-2026-004.mp3', notes: 'Reliance technical alignment discussion. High satisfaction.', custId: relCustId },
      { ivrCallId: 'CALL-2026-007', caller: '+911145678900', customer: '+919825012345', direction: 'outbound', status: 'answered', duration: 95, outcome: 'Follow-up Required', recUrl: 'https://recordings.crm.local/rec-2026-005.mp3', notes: 'Requested follow-up demo on Thursday afternoon.', custId: null },
      { ivrCallId: 'CALL-2026-008', caller: '+919820055443', customer: '+911145678900', direction: 'inbound', status: 'missed', duration: 0, outcome: 'Missed Call', recUrl: null, notes: 'After-hours inbound call logged automatically.', custId: mahindraCustId },
    ];

    for (const c of callsToSeed) {
      await queryWithRetry(`
        IF NOT EXISTS (SELECT 1 FROM calls WHERE ivr_call_id = @callId)
          INSERT INTO calls (id, ivr_call_id, caller_number, customer_number, direction, assigned_to, customer_id, status, duration, outcome, notes, recording_url, initiated_at, answered_at, ended_at)
          VALUES (NEWID(), @callId, @caller, @customer, @direction, @assignedTo, @custId, @status, @duration, @outcome, @notes, @recUrl, DATEADD(hour, -5, GETUTCDATE()), DATEADD(hour, -5, GETUTCDATE()), DATEADD(minute, -290, GETUTCDATE()));
      `, [
        { name: 'callId', type: sql.NVarChar, value: c.ivrCallId },
        { name: 'caller', type: sql.NVarChar, value: c.caller },
        { name: 'customer', type: sql.NVarChar, value: c.customer },
        { name: 'direction', type: sql.NVarChar, value: c.direction },
        { name: 'status', type: sql.NVarChar, value: c.status },
        { name: 'duration', type: sql.Int, value: c.duration },
        { name: 'outcome', type: sql.NVarChar, value: c.outcome },
        { name: 'recUrl', type: sql.NVarChar, value: c.recUrl },
        { name: 'notes', type: sql.NVarChar, value: c.notes },
        { name: 'assignedTo', type: sql.UniqueIdentifier, value: salesUser1 },
        { name: 'custId', type: sql.UniqueIdentifier, value: c.custId || null },
      ]);
    }

    // -------------------------------------------------------------
    // 11. CALLING CAMPAIGNS (5 Campaigns)
    // -------------------------------------------------------------
    logger.info('Step 11: Seeding 5 Calling Campaigns...');
    const campaignsToSeed = [
      { name: 'Q4 Enterprise Tech Outreach', type: 'Outbound', mode: 'Preview', status: 'Active', purpose: 'Outreach to qualified leads for Q4 software renewals' },
      { name: 'BFSI Telephony Migration 2026', type: 'Outbound', mode: 'Progressive', status: 'Active', purpose: 'Banking & Financial Services dedicated IVR trunk upgrades' },
      { name: 'Inbound Lost Leads Re-engagement', type: 'Outbound', mode: 'Predictive', status: 'Scheduled', purpose: 'Reconnecting with previous lost leads offering 15% discount' },
      { name: 'SaaS Cloud Dialer Campaign', type: 'Outbound', mode: 'Preview', status: 'Completed', purpose: 'Product showcase for SME call centers in Bengaluru & Mumbai' },
      { name: 'Annual Maintenance Renewal Blitz', type: 'Outbound', mode: 'Progressive', status: 'Paused', purpose: 'Year-end contract renewal reminders for key enterprise accounts' },
    ];

    for (const cmp of campaignsToSeed) {
      await queryWithRetry(`
        IF NOT EXISTS (SELECT 1 FROM call_campaigns WHERE name = @name)
          INSERT INTO call_campaigns (id, name, type, dialer_mode, status, purpose, start_time, end_time, max_attempts, assigned_to, created_by)
          VALUES (NEWID(), @name, @type, @mode, @status, @purpose, GETUTCDATE(), DATEADD(day, 30, GETUTCDATE()), 3, @assignedTo, @assignedTo);
      `, [
        { name: 'name', type: sql.NVarChar, value: cmp.name },
        { name: 'type', type: sql.NVarChar, value: cmp.type },
        { name: 'mode', type: sql.NVarChar, value: cmp.mode },
        { name: 'status', type: sql.NVarChar, value: cmp.status },
        { name: 'purpose', type: sql.NVarChar, value: cmp.purpose },
        { name: 'assignedTo', type: sql.UniqueIdentifier, value: salesUser1 },
      ]);

      const cmpId = (await queryWithRetry("SELECT id FROM call_campaigns WHERE name = @n", [{ name: 'n', type: sql.NVarChar, value: cmp.name }])).recordset[0]?.id;
      if (cmpId) {
        await queryWithRetry(`
          IF NOT EXISTS (SELECT 1 FROM campaign_contacts WHERE campaign_id = @cmpId AND phone = @phone)
            INSERT INTO campaign_contacts (id, campaign_id, phone, status, attempts, last_outcome)
            VALUES (NEWID(), @cmpId, @phone, 'Pending', 1, 'Callback Requested');
        `, [
          { name: 'cmpId', type: sql.UniqueIdentifier, value: cmpId },
          { name: 'phone', type: sql.NVarChar, value: '+919820011223' },
        ]);
      }
    }

    // -------------------------------------------------------------
    // 12. FOLLOW-UPS & TASKS (8 Tasks)
    // -------------------------------------------------------------
    logger.info('Step 12: Seeding 8 Follow-up Tasks...');
    const tasksToSeed = [
      { title: 'Product Demo with Tata Tech Team', type: 'Demo', priority: 'High', status: 'Pending', desc: 'Walkthrough of lead Kanban pipeline and Click-to-Call telephony.', dueHours: 2 },
      { title: 'Send Revised Quotation to Zomato', type: 'Follow-up', priority: 'Medium', status: 'Pending', desc: 'Include 10% annual prepayment discount on SaaS licenses.', dueHours: 4 },
      { title: 'Contract Signature Follow-up with Reliance', type: 'Meeting', priority: 'Urgent', status: 'Pending', desc: 'Final review of Master Services Agreement with Legal team.', dueHours: 24 },
      { title: 'Inbound Missed Call Callback - Airtel DID', type: 'Call', priority: 'High', status: 'Pending', desc: 'Rapid callback for missed inbound inquiry.', dueHours: -2 },
      { title: 'Security Architecture Review - HDFC Bank', type: 'Meeting', priority: 'Urgent', status: 'Pending', desc: 'Review SOC2 and ISO27001 compliance checklist.', dueHours: 72 },
      { title: 'Initial Discovery Call - Aditya Birla', type: 'Call', priority: 'Medium', status: 'Completed', desc: 'Conducted 25-minute requirements discovery call successfully.', dueHours: -48 },
      { title: 'Escalated IVR Issue Review', type: 'Meeting', priority: 'High', status: 'Completed', desc: 'Post-mortem with engineering on peak load call drops.', dueHours: -24 },
      { title: 'Quarterly Business Review - L&T', type: 'Meeting', priority: 'Low', status: 'Pending', desc: 'Q4 strategic executive review on ticket SLAs and user adoption.', dueHours: 120 },
    ];

    for (const t of tasksToSeed) {
      await queryWithRetry(`
        IF NOT EXISTS (SELECT 1 FROM follow_ups WHERE title = @title)
          INSERT INTO follow_ups (id, type, title, description, scheduled_at, assigned_to, priority, status)
          VALUES (NEWID(), @type, @title, @desc, DATEADD(hour, @hours, GETUTCDATE()), @assignedTo, @priority, @status);
      `, [
        { name: 'title', type: sql.NVarChar, value: t.title },
        { name: 'type', type: sql.NVarChar, value: t.type },
        { name: 'priority', type: sql.NVarChar, value: t.priority },
        { name: 'status', type: sql.NVarChar, value: t.status },
        { name: 'desc', type: sql.NVarChar, value: t.desc },
        { name: 'hours', type: sql.Int, value: t.dueHours },
        { name: 'assignedTo', type: sql.UniqueIdentifier, value: salesUser1 },
      ]);
    }

    // -------------------------------------------------------------
    // 13. SUPPORT TICKETS & MESSAGES (8 Tickets)
    // -------------------------------------------------------------
    logger.info('Step 13: Seeding 8 Support Tickets & Conversations...');
    const catTech = (await queryWithRetry("SELECT TOP 1 id FROM ticket_categories WHERE name = 'Technical Issue'")).recordset[0]?.id;
    const catBilling = (await queryWithRetry("SELECT TOP 1 id FROM ticket_categories WHERE name = 'Billing'")).recordset[0]?.id;
    const catFeature = (await queryWithRetry("SELECT TOP 1 id FROM ticket_categories WHERE name = 'Feature Request'")).recordset[0]?.id || catTech;
    const catAccount = (await queryWithRetry("SELECT TOP 1 id FROM ticket_categories WHERE name = 'Account & Access'")).recordset[0]?.id || catTech;

    const slaCritical = (await queryWithRetry("SELECT TOP 1 id FROM sla_configurations WHERE priority = 'Critical'")).recordset[0]?.id;
    const slaHigh = (await queryWithRetry("SELECT TOP 1 id FROM sla_configurations WHERE priority = 'High'")).recordset[0]?.id;
    const slaMedium = (await queryWithRetry("SELECT TOP 1 id FROM sla_configurations WHERE priority = 'Medium'")).recordset[0]?.id;
    const slaLow = (await queryWithRetry("SELECT TOP 1 id FROM sla_configurations WHERE priority = 'Low'")).recordset[0]?.id;

    const ticketsToSeed = [
      { num: 'TICK-1001', title: 'IVR bridge drop on incoming high-volume trunk', desc: 'Calls dropping intermittently on DID trunk during peak morning traffic.', cat: catTech, priority: 'Critical', status: 'Open', sla: slaCritical, cust: relCustId, team: l2SupportTeamId, agent: supportUser2 },
      { num: 'TICK-1002', title: 'GST invoice clarification for October 2026', desc: 'Need updated invoice with 18% IGST break-up for Maharashtra state filing.', cat: catBilling, priority: 'High', status: 'In Progress', sla: slaHigh, cust: hdfcCustId, team: l1SupportTeamId, agent: supportUser1 },
      { num: 'TICK-1003', title: 'Webhook latency spike during campaign blast', desc: 'Webhooks receiving call events with 45s latency during 50-call concurrent burst.', cat: catTech, priority: 'High', status: 'Open', sla: slaHigh, cust: airtelCustId, team: l2SupportTeamId, agent: supportUser2 },
      { num: 'TICK-1004', title: 'Request for 25 additional IVR agent licenses', desc: 'Expanding dealership customer care team in Pune and Mumbai.', cat: catFeature, priority: 'Medium', status: 'Waiting for Customer', sla: slaMedium, cust: mahindraCustId, team: l1SupportTeamId, agent: supportUser1 },
      { num: 'TICK-1005', title: 'Custom SLA escalation rule configuration', desc: 'Require automated SMS escalation for P1 plant machinery breakdown tickets.', cat: catAccount, priority: 'Low', status: 'In Progress', sla: slaLow, cust: ltCustId, team: l1SupportTeamId, agent: supportUser1 },
      { num: 'TICK-1006', title: 'Audio recording export format request', desc: 'Need weekly scheduled export of all inbound call recordings in WAV format.', cat: catFeature, priority: 'Low', status: 'Resolved', sla: slaLow, cust: godrejCustId, team: l1SupportTeamId, agent: supportUser1 },
      { num: 'TICK-1007', title: 'Single Sign-On (SSO) SAML failure', desc: 'Users receiving invalid signature error during Okta IDP redirect.', cat: catTech, priority: 'Critical', status: 'Resolved', sla: slaCritical, cust: relCustId, team: l2SupportTeamId, agent: supportUser2 },
      { num: 'TICK-1008', title: 'Inbound DID trunk number porting query', desc: 'Assistance required porting toll-free 1800 number to CRM IVR bridge.', cat: catAccount, priority: 'Medium', status: 'Open', sla: slaMedium, cust: hdfcCustId, team: l1SupportTeamId, agent: supportUser1 },
    ];

    for (const tkt of ticketsToSeed) {
      if (!tkt.cust || !tkt.cat) continue;
      await queryWithRetry(`
        IF NOT EXISTS (SELECT 1 FROM tickets WHERE ticket_number = @num)
          INSERT INTO tickets (
            id, ticket_number, title, description, category_id, priority, status,
            assigned_to, team_id, customer_id, sla_id, first_response_due_at, resolution_due_at, created_at
          )
          VALUES (
            NEWID(), @num, @title, @desc, @cat, @priority, @status,
            @agent, @team, @cust, @sla, DATEADD(hour, 1, GETUTCDATE()), DATEADD(hour, 6, GETUTCDATE()), DATEADD(hour, -12, GETUTCDATE())
          );
      `, [
        { name: 'num', type: sql.NVarChar, value: tkt.num },
        { name: 'title', type: sql.NVarChar, value: tkt.title },
        { name: 'desc', type: sql.NVarChar, value: tkt.desc },
        { name: 'cat', type: sql.UniqueIdentifier, value: tkt.cat },
        { name: 'priority', type: sql.NVarChar, value: tkt.priority },
        { name: 'status', type: sql.NVarChar, value: tkt.status },
        { name: 'sla', type: sql.UniqueIdentifier, value: tkt.sla || null },
        { name: 'cust', type: sql.UniqueIdentifier, value: tkt.cust },
        { name: 'team', type: sql.UniqueIdentifier, value: tkt.team },
        { name: 'agent', type: sql.UniqueIdentifier, value: tkt.agent },
      ]);

      const tktRec = (await queryWithRetry("SELECT id FROM tickets WHERE ticket_number = @n", [{ name: 'n', type: sql.NVarChar, value: tkt.num }])).recordset[0];
      if (tktRec) {
        await queryWithRetry(`
          IF NOT EXISTS (SELECT 1 FROM ticket_messages WHERE ticket_id = @tktId)
          BEGIN
            INSERT INTO ticket_messages (id, ticket_id, message, is_internal, sent_by, created_at)
            VALUES (NEWID(), @tktId, @msg1, 0, @agent, DATEADD(hour, -10, GETUTCDATE()));

            INSERT INTO ticket_messages (id, ticket_id, message, is_internal, sent_by, created_at)
            VALUES (NEWID(), @tktId, @msg2, 1, @agent, DATEADD(hour, -8, GETUTCDATE()));
          END;
        `, [
          { name: 'tktId', type: sql.UniqueIdentifier, value: tktRec.id },
          { name: 'agent', type: sql.UniqueIdentifier, value: tkt.agent },
          { name: 'msg1', type: sql.NVarChar, value: `Ticket received and acknowledged. Priority set to ${tkt.priority}. Our L2 engineers are investigating the trunk metrics.` },
          { name: 'msg2', type: sql.NVarChar, value: `Internal note: Telephony provider checked; latency normalized on gateway trunk.` },
        ]);
      }
    }

    // -------------------------------------------------------------
    // 14. AUTOMATION & WORKFLOW RULES (5 Rules)
    // -------------------------------------------------------------
    logger.info('Step 14: Seeding 5 Automation Rules...');
    const rulesToSeed = [
      { name: 'Round-Robin Lead Assignment', event: 'lead.created', conditions: JSON.stringify([{ field: 'status', op: 'eq', value: 'New' }]), actions: JSON.stringify([{ type: 'assign_round_robin', team: 'Enterprise Sales' }]) },
      { name: 'Critical SLA Breach Escalation', event: 'ticket.sla_breached', conditions: JSON.stringify([{ field: 'priority', op: 'eq', value: 'Critical' }]), actions: JSON.stringify([{ type: 'notify_manager', channel: 'in_app' }, { type: 'reassign_team', team: 'L2 Technical Escalations' }]) },
      { name: '24-Hour Demo Task Reminder', event: 'task.due_soon', conditions: JSON.stringify([{ field: 'type', op: 'eq', value: 'Demo' }]), actions: JSON.stringify([{ type: 'send_reminder_notification' }]) },
      { name: 'Auto-Tag High-Value Opportunities', event: 'opportunity.created', conditions: JSON.stringify([{ field: 'value', op: 'gte', value: 1000000 }]), actions: JSON.stringify([{ type: 'add_tag', tag: 'Enterprise High-Priority' }]) },
      { name: 'Lost Lead Follow-up Winback', event: 'lead.status_changed', conditions: JSON.stringify([{ field: 'status', op: 'eq', value: 'Lost' }]), actions: JSON.stringify([{ type: 'schedule_task', delay_days: 30, task_title: 'Quarterly Winback Outreach' }]) },
    ];

    for (const r of rulesToSeed) {
      await queryWithRetry(`
        IF NOT EXISTS (SELECT 1 FROM automation_rules WHERE name = @name)
        BEGIN
          DECLARE @ruleId UNIQUEIDENTIFIER = NEWID();
          INSERT INTO automation_rules (id, name, trigger_event, conditions, actions, is_active, execution_count, last_executed_at, created_by)
          VALUES (@ruleId, @name, @event, @cond, @act, 1, 14, DATEADD(hour, -2, GETUTCDATE()), @createdBy);

          INSERT INTO automation_executions (id, rule_id, trigger_data, status, result, executed_at)
          VALUES (NEWID(), @ruleId, '{"entity": "system_auto"}', 'Success', '{"action": "executed_successfully"}', DATEADD(hour, -2, GETUTCDATE()));
        END;
      `, [
        { name: 'name', type: sql.NVarChar, value: r.name },
        { name: 'event', type: sql.NVarChar, value: r.event },
        { name: 'cond', type: sql.NVarChar, value: r.conditions },
        { name: 'act', type: sql.NVarChar, value: r.actions },
        { name: 'createdBy', type: sql.UniqueIdentifier, value: superAdmin },
      ]);
    }

    // -------------------------------------------------------------
    // 15. AUDIT LOGS (8 Realistic Entries)
    // -------------------------------------------------------------
    logger.info('Step 15: Seeding 8 Audit Logs...');
    const auditsToSeed = [
      { action: 'user.login', entity: 'user', entityId: superAdmin, oldVal: null, newVal: '{"status":"success","ip":"::1"}' },
      { action: 'lead.created', entity: 'lead', entityId: 'LEAD-101', oldVal: null, newVal: '{"name":"Vikram Mehta","company":"Tata Consultancy Services"}' },
      { action: 'lead.assigned', entity: 'lead', entityId: 'LEAD-101', oldVal: '{"assigned_to":null}', newVal: '{"assigned_to":"sales@crm.com"}' },
      { action: 'opportunity.created', entity: 'opportunity', entityId: 'OPP-101', oldVal: null, newVal: '{"title":"Annual CRM Enterprise Suite","value":1250000}' },
      { action: 'quotation.approved', entity: 'quotation', entityId: 'QT-2026-001', oldVal: '{"status":"Sent"}', newVal: '{"status":"Approved"}' },
      { action: 'ticket.created', entity: 'ticket', entityId: 'TICK-1001', oldVal: null, newVal: '{"ticket_number":"TICK-1001","priority":"Critical"}' },
      { action: 'call.completed', entity: 'call', entityId: 'CALL-2026-001', oldVal: null, newVal: '{"duration":184,"outcome":"Interested"}' },
      { action: 'settings.updated', entity: 'settings', entityId: 'general', oldVal: '{"timezone":"UTC"}', newVal: '{"timezone":"Asia/Kolkata"}' },
    ];

    for (const a of auditsToSeed) {
      await queryWithRetry(`
        INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at)
        VALUES (NEWID(), @userId, @action, @entity, @entityId, @oldV, @newV, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', DATEADD(minute, -30, GETUTCDATE()));
      `, [
        { name: 'action', type: sql.NVarChar, value: a.action },
        { name: 'entity', type: sql.NVarChar, value: a.entity },
        { name: 'entityId', type: sql.NVarChar, value: a.entityId },
        { name: 'oldV', type: sql.NVarChar, value: a.oldVal },
        { name: 'newV', type: sql.NVarChar, value: a.newVal },
        { name: 'userId', type: sql.UniqueIdentifier, value: superAdmin },
      ]);
    }

    // -------------------------------------------------------------
    // 16. NOTIFICATIONS (Realistic User Notifications)
    // -------------------------------------------------------------
    logger.info('Step 16: Seeding User Notifications...');
    const notifs = [
      { userId: salesUser1, type: 'lead_assigned', title: 'New Qualified Lead Assigned', body: 'Vikram Mehta (Tata Consultancy Services) has been assigned to you.' },
      { userId: salesUser1, type: 'followup_reminder', title: 'Upcoming Product Demo', body: 'Demo with Tata Tech Team is scheduled in 2 hours.' },
      { userId: supportUser1, type: 'ticket_created', title: 'New High Priority Ticket #TICK-1002', body: 'HDFC Bank Customer Care submitted GST invoice clarification.' },
      { userId: supportUser2, type: 'sla_warning', title: 'Critical SLA Warning #TICK-1001', body: 'Resolution deadline approaching in 3 hours for Reliance trunk drop.' },
      { userId: superAdmin, type: 'quotation_approved', title: 'Quotation Approved: QT-2026-001', body: 'Reliance Retail approved commercial quote for ₹14,75,000.' },
    ];

    for (const n of notifs) {
      await queryWithRetry(`
        INSERT INTO notifications (id, user_id, type, title, body, is_read, created_at)
        VALUES (NEWID(), @userId, @type, @title, @body, 0, DATEADD(hour, -1, GETUTCDATE()));
      `, [
        { name: 'userId', type: sql.UniqueIdentifier, value: n.userId },
        { name: 'type', type: sql.NVarChar, value: n.type },
        { name: 'title', type: sql.NVarChar, value: n.title },
        { name: 'body', type: sql.NVarChar, value: n.body },
      ]);
    }

    logger.info('🎉 ALL CRM MODULES FULLY POPULATED WITH REALISTIC PRODUCTION-GRADE SAMPLE DATA!');
  } catch (err: any) {
    logger.error('❌ Seeding failed', { error: err.message, stack: err.stack });
    throw err;
  }
}

if (require.main === module) {
  runComprehensiveSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
