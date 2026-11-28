import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();

// All user management routes require authentication
// Assignable employee directory (active Admin, Sales, Support) for lead/campaign assignment & tracking
router.get('/assignable', (req, res) => usersController.getAssignable(req, res));

// All users list: Super Admin & Admin get full access; active users / dropdown queries allowed for team assignment
router.get('/', (req, res, next) => {
  if (
    req.user?.roleName === 'Super Admin' ||
    req.user?.roleName === 'Admin' ||
    req.query.isActive === 'true' ||
    req.query.forAssignment === 'true' ||
    req.query.limit !== undefined
  ) {
    return usersController.list(req, res);
  }
  return requirePermission('users', 'all', 'view')(req, res, next);
}, (req, res) => usersController.list(req, res));
router.get('/my/login-history', (req, res) => usersController.getMyLoginHistory(req, res));
router.get('/:id', requirePermission('users', 'all', 'view'), (req, res) => usersController.getById(req, res));
router.get('/:id/login-history', requirePermission('users', 'activity', 'view'), (req, res) => usersController.getLoginHistory(req, res));
router.post('/', requirePermission('users', 'all', 'create'), (req, res) => usersController.create(req, res));
router.put('/:id', requirePermission('users', 'all', 'edit'), (req, res) => usersController.update(req, res));
router.patch('/:id/activate', requirePermission('users', 'all', 'edit'), (req, res) => usersController.activate(req, res));
router.patch('/:id/deactivate', requirePermission('users', 'all', 'edit'), (req, res) => usersController.deactivate(req, res));
router.post('/:id/reset-password', requirePermission('users', 'all', 'edit'), (req, res) => usersController.resetPassword(req, res));
router.delete('/:id', requirePermission('users', 'all', 'delete'), (req, res) => usersController.delete(req, res));

export default router;

