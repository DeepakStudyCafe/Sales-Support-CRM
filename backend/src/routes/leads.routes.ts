import { Router } from 'express';
import { leadsController } from '../controllers/leads.controller';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();

router.get('/stats', requirePermission('dashboard', 'overview', 'view'), (req, res) => leadsController.getDashboardStats(req, res));
router.get('/sources', (req, res) => leadsController.getSources(req, res));
router.get('/', requirePermission('leads', 'all', 'view'), (req, res) => leadsController.list(req, res));
router.get('/:id', requirePermission('leads', 'all', 'view'), (req, res) => leadsController.getById(req, res));
router.get('/:id/activities', requirePermission('leads', 'all', 'view'), (req, res) => leadsController.getActivities(req, res));
router.post('/', requirePermission('leads', 'all', 'create'), (req, res) => leadsController.create(req, res));
router.put('/:id', requirePermission('leads', 'all', 'edit'), (req, res) => leadsController.update(req, res));
router.delete('/:id', requirePermission('leads', 'all', 'delete'), (req, res) => leadsController.delete(req, res));
router.patch('/:id/assign', requirePermission('leads', 'assignment', 'assign'), (req, res) => leadsController.assign(req, res));
router.post('/bulk-assign', requirePermission('leads', 'assignment', 'assign'), (req, res) => leadsController.bulkAssign(req, res));
router.patch('/:id/convert', requirePermission('leads', 'all', 'edit'), (req, res) => leadsController.convert(req, res));
router.patch('/:id/lost', requirePermission('leads', 'all', 'edit'), (req, res) => leadsController.markLost(req, res));

export default router;

