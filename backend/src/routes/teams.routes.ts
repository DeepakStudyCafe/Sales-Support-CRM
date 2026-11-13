import { Router, Request, Response } from 'express';
import { getPool, sql } from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { requirePermission } from '../middleware/permission.middleware';
import { z } from 'zod';

const router = Router();

const teamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  department_id: z.string().uuid().optional(),
});

const departmentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

// Teams
router.get('/', requirePermission('users', 'teams', 'view'), async (req: Request, res: Response) => {
  const pool = getPool();
  const result = await pool.request().query(`
    SELECT t.*, d.name as department_name,
      (SELECT COUNT(1) FROM users WHERE team_id = t.id AND deleted_at IS NULL) as member_count
    FROM teams t
    LEFT JOIN departments d ON t.department_id = d.id
    ORDER BY t.name ASC
  `);
  sendSuccess(res, result.recordset);
});

router.post('/', requirePermission('users', 'teams', 'create'), async (req: Request, res: Response) => {
  const parsed = teamSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400);
    return;
  }
  const pool = getPool();
  const result = await pool.request()
    .input('name', sql.NVarChar, parsed.data.name)
    .input('description', sql.NVarChar, parsed.data.description ?? null)
    .input('department_id', sql.UniqueIdentifier, parsed.data.department_id ?? null)
    .query<{ id: string }>(`
      INSERT INTO teams (name, description, department_id)
      OUTPUT INSERTED.id
      VALUES (@name, @description, @department_id)
    `);
  sendSuccess(res, { id: result.recordset[0].id }, 'Team created', 201);
});

router.put('/:id', requirePermission('users', 'teams', 'edit'), async (req: Request, res: Response) => {
  const parsed = teamSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400);
    return;
  }
  const pool = getPool();
  const setClauses: string[] = ['updated_at = GETUTCDATE()'];
  const request = pool.request().input('id', sql.UniqueIdentifier, req.params.id);

  if (parsed.data.name) {
    setClauses.push('name = @name');
    request.input('name', sql.NVarChar, parsed.data.name);
  }
  if (parsed.data.description !== undefined) {
    setClauses.push('description = @description');
    request.input('description', sql.NVarChar, parsed.data.description ?? null);
  }
  if (parsed.data.department_id !== undefined) {
    setClauses.push('department_id = @department_id');
    request.input('department_id', sql.UniqueIdentifier, parsed.data.department_id ?? null);
  }

  await request.query(`UPDATE teams SET ${setClauses.join(', ')} WHERE id = @id`);
  sendSuccess(res, null, 'Team updated');
});

// Departments
router.get('/departments/all', requirePermission('users', 'teams', 'view'), async (req: Request, res: Response) => {
  const pool = getPool();
  const result = await pool.request().query('SELECT * FROM departments ORDER BY name ASC');
  sendSuccess(res, result.recordset);
});

router.post('/departments', requirePermission('users', 'teams', 'create'), async (req: Request, res: Response) => {
  const parsed = departmentSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400);
    return;
  }
  const pool = getPool();
  const result = await pool.request()
    .input('name', sql.NVarChar, parsed.data.name)
    .input('description', sql.NVarChar, parsed.data.description ?? null)
    .query<{ id: string }>(`
      INSERT INTO departments (name, description)
      OUTPUT INSERTED.id
      VALUES (@name, @description)
    `);
  sendSuccess(res, { id: result.recordset[0].id }, 'Department created', 201);
});

export default router;
