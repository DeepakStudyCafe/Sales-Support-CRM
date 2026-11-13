import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimit } from '../middleware/rateLimiter.middleware';

const router = Router();

// Public routes (rate-limited)
router.post('/login', authRateLimit, (req, res) => authController.login(req, res));
router.post('/forgot-password', authRateLimit, (req, res) => authController.forgotPassword(req, res));
router.post('/reset-password', authRateLimit, (req, res) => authController.resetPassword(req, res));
router.post('/refresh', (req, res) => authController.refresh(req, res));

// Protected routes
router.post('/logout', authenticate, (req, res) => authController.logout(req, res));
router.get('/me', authenticate, (req, res) => authController.getMe(req, res));
router.post('/change-password', authenticate, (req, res) => authController.changePassword(req, res));

export default router;

