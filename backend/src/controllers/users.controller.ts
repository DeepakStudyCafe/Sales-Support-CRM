import { Request, Response } from 'express';
import { z } from 'zod';
import { userService } from '../services/user.service';
import { userRepository } from '../repositories/user.repository';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPaginationParams } from '../utils/pagination';

const createUserSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
  first_name: z.string().min(1, 'First name required').max(100),
  last_name: z.string().min(1, 'Last name required').max(100),
  roleName: z.enum(['Admin', 'Sales', 'Support']),
  team_id: z.string().uuid().optional(),
  department_id: z.string().uuid().optional(),
  ivr_agent_id: z.string().optional(),
  ivr_extension: z.string().optional(),
  password: z.string().min(8).optional(),
  modules: z.array(z.string()).optional(),
});

const updateUserSchema = createUserSchema.partial().omit({ email: true });

export class UsersController {
  async list(req: Request, res: Response): Promise<void> {
    const { page, limit } = getPaginationParams(req.query);
    const result = await userService.listUsers({
      page, limit,
      search: req.query.search as string,
      roleId: req.query.roleId as string,
      isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined,
      teamId: req.query.teamId as string,
      departmentId: req.query.departmentId as string,
    });
    sendPaginated(res, result.data, { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) });
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const user = await userService.getUserById(req.params.id);
      sendSuccess(res, user);
    } catch (err) {
      sendError(res, (err as Error).message, 404);
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    const parsed = createUserSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }
    try {
      const result = await userService.createUser({ ...parsed.data, createdBy: req.user.userId });
      sendSuccess(res, result, 'User created successfully', 201);
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    const parsed = updateUserSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }
    try {
      const user = await userService.updateUser(req.params.id, parsed.data, req.user.userId);
      sendSuccess(res, user, 'User updated successfully');
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  }

  async activate(req: Request, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    try {
      const user = await userService.activateUser(req.params.id, req.user.userId);
      sendSuccess(res, user, 'User activated');
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  }

  async deactivate(req: Request, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    try {
      const user = await userService.deactivateUser(req.params.id, req.user.userId);
      sendSuccess(res, user, 'User deactivated');
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    try {
      const tempPassword = await userService.resetUserPassword(req.params.id, req.user.userId);
      sendSuccess(res, { temporaryPassword: tempPassword }, 'Password reset successfully');
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    try {
      await userService.deleteUser(req.params.id, req.user.userId);
      sendSuccess(res, null, 'User deleted successfully');
    } catch (err) {
      sendError(res, (err as Error).message, 400);
    }
  }

  async getLoginHistory(req: Request, res: Response): Promise<void> {
    const { page, limit } = getPaginationParams(req.query);
    const result = await userRepository.getLoginHistory(req.params.id, { page, limit });
    sendPaginated(res, result.data, { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) });
  }

  async getMyLoginHistory(req: Request, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
    const { page, limit } = getPaginationParams(req.query);
    const result = await userRepository.getLoginHistory(req.user.userId, { page, limit });
    sendPaginated(res, result.data, { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) });
  }
}

export const usersController = new UsersController();

