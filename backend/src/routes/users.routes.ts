import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();

// All user management routes require authentication + permissions
router.get('/', requirePermission('users', 'all', 'view'), (req, res) => usersController.list(req, res));
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

