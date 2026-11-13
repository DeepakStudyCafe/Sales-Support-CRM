import { Router, Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { sendSuccess, sendError, sendPaginated } from '../utils/response';
import { getPaginationParams } from '../utils/pagination';
import { z } from 'zod';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const { page, limit } = getPaginationParams(req.query);
  const result = await notificationService.getNotifications(req.user.userId, {
    page, limit, unreadOnly: req.query.unreadOnly === 'true',
  });
  sendPaginated(res, result.data, { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) }, undefined, { unreadCount: result.unreadCount });
});

router.get('/unread-count', async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  const count = await notificationService.getUnreadCount(req.user.userId);
  sendSuccess(res, { count });
});

router.patch('/:id/read', async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  await notificationService.markAsRead(req.params.id, req.user.userId);
  sendSuccess(res, null, 'Notification marked as read');
});

router.patch('/mark-all-read', async (req: Request, res: Response) => {
  if (!req.user) { sendError(res, 'Not authenticated', 401); return; }
  await notificationService.markAllAsRead(req.user.userId);
  sendSuccess(res, null, 'All notifications marked as read');
});

export default router;

