import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authService } from '../services/auth.service';
import { userRepository } from '../repositories/user.repository';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Valid email required'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[^A-Za-z0-9]/, 'Must contain special character'),
});

export class AuthController {
  async login(req: Request, res: Response): Promise<void> {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip;
    const userAgent = req.headers['user-agent'];

    try {
      const result = await authService.login(
        parsed.data.email,
        parsed.data.password,
        ipAddress,
        userAgent
      );

      // Set refresh token as HTTP-only cookie
      res.cookie('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/v1/auth',
      });

      // Set access token cookie too (optional, frontend can use Authorization header)
      res.cookie('access_token', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      sendSuccess(res, {
        user: result.user,
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      }, 'Login successful');
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('locked') || err.message.includes('deactivated')) {
        sendError(res, err.message, 403);
      } else if (err.message.includes('Invalid email or password')) {
        sendError(res, err.message, 401);
      } else {
        logger.error('Login error', { error: err.message });
        sendError(res, `Login failed: ${err.message}`, 500);
      }
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    res.clearCookie('refresh_token');
    res.clearCookie('access_token');
    sendSuccess(res, null, 'Logged out successfully');
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies?.refresh_token ?? req.body?.refreshToken;
    if (!refreshToken) {
      sendError(res, 'Refresh token required', 401);
      return;
    }

    try {
      const tokens = await authService.refreshTokens(refreshToken);

      res.cookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/v1/auth',
      });

      res.cookie('access_token', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000,
      });

      sendSuccess(res, {
        tokens: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: 15 * 60,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 15 * 60,
      }, 'Token refreshed');
    } catch (error) {
      res.clearCookie('refresh_token');
      res.clearCookie('access_token');
      sendError(res, 'Invalid or expired refresh token', 401);
    }
  }

  async getMe(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      sendError(res, 'Not authenticated', 401);
      return;
    }

    try {
      const user = await userRepository.findByIdWithRole(req.user.userId);
      if (!user) {
        sendError(res, 'User not found', 404);
        return;
      }

      // Get permissions safely
      const permissions = await authService.getPermissions(user.id);

      const formattedUser = {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        roleId: user.role_id,
        roleName: user.role_name || 'User',
        teamId: user.team_id,
        teamName: user.team_name,
        departmentId: user.department_id,
        departmentName: user.department_name,
        ivrAgentId: user.ivr_agent_id,
        ivrExtension: user.ivr_extension,
        isActive: user.is_active,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
        // Snake-case aliases
        first_name: user.first_name,
        last_name: user.last_name,
        role_name: user.role_name,
        role_id: user.role_id,
        is_active: user.is_active,
      };

      sendSuccess(res, { user: formattedUser, permissions }, 'User profile retrieved');
    } catch (error) {
      logger.error('Error in getMe', { error: (error as Error).message });
      sendError(res, 'Failed to retrieve user profile', 500);
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    if (!req.user) { sendError(res, 'Not authenticated', 401); return; }

    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    try {
      await authService.changePassword(req.user.userId, parsed.data.oldPassword, parsed.data.newPassword);
      res.clearCookie('refresh_token');
      sendSuccess(res, null, 'Password changed successfully. Please login again.');
    } catch (error) {
      sendError(res, (error as Error).message, 400);
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Valid email required', 400);
      return;
    }

    try {
      const token = await authService.initiatePasswordReset(parsed.data.email);
      // In production, send email here with reset link
      // For now, return token in development only
      const responseData = process.env.NODE_ENV === 'development'
        ? { resetToken: token, message: 'In production, a reset email would be sent' }
        : null;

      sendSuccess(res, responseData, 'If an account exists with that email, a password reset link has been sent.');
    } catch (error) {
      sendError(res, 'Failed to process request', 500);
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 'Validation failed', 400, parsed.error.flatten().fieldErrors as Record<string, string[]>);
      return;
    }

    try {
      await authService.resetPassword(parsed.data.token, parsed.data.newPassword);
      sendSuccess(res, null, 'Password reset successfully. Please login with your new password.');
    } catch (error) {
      sendError(res, (error as Error).message, 400);
    }
  }
}

export const authController = new AuthController();

