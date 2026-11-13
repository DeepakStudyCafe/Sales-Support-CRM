import { Router } from 'express';
import { Request, Response } from 'express';
import { roleRepository } from '../repositories/role.repository';
import { authService } from '../services/auth.service';
import { requirePermission } from '../middleware/permission.middleware';
import { sendSuccess, sendError } from '../utils/response';
import { z } from 'zod';

const router = Router();

// Get all roles
router.get('/', (req: Request, res: Response) => {
  roleRepository.findAll()
    .then(roles => sendSuccess(res, roles))
    .catch(err => sendError(res, (err as Error).message, 500));
});

// Get all permissions
router.get('/permissions', requirePermission('users', 'permissions', 'view'), (req: Request, res: Response) => {
  roleRepository.getAllPermissions()
    .then(perms => sendSuccess(res, perms))
    .catch(err => sendError(res, (err as Error).message, 500));
});

// Get permission matrix
router.get('/matrix', requirePermission('users', 'permissions', 'view'), async (req: Request, res: Response) => {
  try {
    const matrix = await roleRepository.getFullPermissionMatrix();
    sendSuccess(res, matrix);
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
});

// Get role permissions
router.get('/:roleId/permissions', requirePermission('users', 'permissions', 'view'), async (req: Request, res: Response) => {
  try {
    const perms = await roleRepository.getRolePermissions(req.params.roleId);
    sendSuccess(res, perms);
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
});

// Set role permissions (Super Admin only)
const setPermissionsSchema = z.object({
  permissions: z.array(z.object({
    permissionId: z.string().uuid(),
    granted: z.boolean(),
  })),
});

router.put('/:roleId/permissions', requirePermission('users', 'permissions', 'edit'), async (req: Request, res: Response) => {
  const parsed = setPermissionsSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400);
    return;
  }

  // Prevent modifying Super Admin permissions
  const role = await roleRepository.findById(req.params.roleId);
  if (role?.name === 'Super Admin') {
    sendError(res, 'Super Admin permissions cannot be modified', 403);
    return;
  }

  try {
    await roleRepository.setRolePermissions(req.params.roleId, parsed.data.permissions);

    // Note: Permission cache for all users of this role will be cleared on next request
    // For immediate effect, we'd need to track users by role and clear each
    sendSuccess(res, null, 'Permissions updated successfully');
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
});

// Get user permission overrides
router.get('/users/:userId/overrides', requirePermission('users', 'permissions', 'view'), async (req: Request, res: Response) => {
  try {
    const overrides = await roleRepository.getUserPermissionOverrides(req.params.userId);
    sendSuccess(res, overrides);
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
});

// Set user permission override
const overrideSchema = z.object({
  permissionId: z.string().uuid(),
  granted: z.boolean(),
  reason: z.string().optional(),
});

router.post('/users/:userId/overrides', requirePermission('users', 'permissions', 'edit'), async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const parsed = overrideSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 400);
    return;
  }

  try {
    await roleRepository.setUserPermissionOverride(
      req.params.userId,
      parsed.data.permissionId,
      parsed.data.granted,
      req.user.userId,
      parsed.data.reason
    );
    // Clear the user's permission cache
    await authService.clearPermissionCache(req.params.userId);
    sendSuccess(res, null, 'Permission override applied');
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
});

// Remove user permission override
router.delete('/users/:userId/overrides/:permissionId', requirePermission('users', 'permissions', 'edit'), async (req: Request, res: Response) => {
  try {
    await roleRepository.removeUserPermissionOverride(req.params.userId, req.params.permissionId);
    await authService.clearPermissionCache(req.params.userId);
    sendSuccess(res, null, 'Permission override removed');
  } catch (err) {
    sendError(res, (err as Error).message, 500);
  }
});

export default router;

