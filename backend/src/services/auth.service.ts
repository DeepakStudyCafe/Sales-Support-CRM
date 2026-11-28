import { hashPassword, comparePassword, generateToken } from '../utils/crypto';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { userRepository } from '../repositories/user.repository';
import { getRedis } from '../config/redis';
import { logger } from '../utils/logger';
import { env } from '../config/environment';

const PERMISSION_CACHE_TTL = 300; // 5 minutes
const LOGIN_LOCK_THRESHOLD = 5;
const LOGIN_LOCK_WINDOW_MINUTES = 15;

export interface LoginResult {
  user: {
    id: string;
    email: string;
    phone?: string;
    firstName: string;
    lastName: string;
    fullName?: string;
    roleName: string;
    roleId: string;
    teamId?: string;
    departmentId?: string;
    ivrAgentId?: string;
    ivrExtension?: string;
    isActive: boolean;
    avatarUrl?: string;
    createdAt?: Date;
    lastLoginAt?: Date;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<LoginResult> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check for account lockout
    const failedCount = await userRepository.getFailedLoginCount(normalizedEmail, LOGIN_LOCK_WINDOW_MINUTES);
    if (failedCount >= LOGIN_LOCK_THRESHOLD) {
      await userRepository.createLoginHistory({
        email: normalizedEmail,
        ip_address: ipAddress,
        user_agent: userAgent,
        status: 'blocked',
        failure_reason: `Account locked after ${LOGIN_LOCK_THRESHOLD} failed attempts`,
      });
      throw new Error('Account temporarily locked. Please try again later or contact admin.');
    }

    // Find user
    const user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      await userRepository.createLoginHistory({
        email: normalizedEmail,
        ip_address: ipAddress,
        user_agent: userAgent,
        status: 'failed',
        failure_reason: 'User not found',
      });
      throw new Error('Invalid email or password');
    }

    if (!user.is_active) {
      await userRepository.createLoginHistory({
        user_id: user.id,
        email: normalizedEmail,
        ip_address: ipAddress,
        user_agent: userAgent,
        status: 'blocked',
        failure_reason: 'Account deactivated',
      });
      throw new Error('Your account has been deactivated. Please contact your administrator.');
    }

    // Verify password
    const passwordValid = await comparePassword(password, user.password_hash);
    if (!passwordValid) {
      await userRepository.createLoginHistory({
        user_id: user.id,
        email: normalizedEmail,
        ip_address: ipAddress,
        user_agent: userAgent,
        status: 'failed',
        failure_reason: 'Invalid password',
      });
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      roleName: user.role_name ?? 'User',
      roleId: user.role_id,
    };

    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Parse expiry for session
    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 7);

    // Store hashed refresh token in DB
    const { hashToken } = await import('../utils/crypto');
    const refreshTokenHash = hashToken(refreshToken);
    await userRepository.createSession({
      userId: user.id,
      refreshTokenHash,
      ipAddress,
      userAgent,
      expiresAt: refreshExpiry,
    });

    // Update last login
    await userRepository.updateLastLogin(user.id);

    // Record success
    await userRepository.createLoginHistory({
      user_id: user.id,
      email: normalizedEmail,
      ip_address: ipAddress,
      user_agent: userAgent,
      status: 'success',
    });

    logger.info('User logged in', { userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        roleName: user.role_name ?? 'User',
        roleId: user.role_id,
        teamId: user.team_id,
        departmentId: user.department_id,
        ivrAgentId: user.ivr_agent_id,
        ivrExtension: user.ivr_extension,
        isActive: user.is_active,
        avatarUrl: user.avatar_url,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
      },
      accessToken,
      refreshToken,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
    };
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = verifyRefreshToken(refreshToken);
      if (payload) {
        // Clear permission cache
        await this.clearPermissionCache(payload.userId);
      }
      // Try to delete the session (we don't have the hash easily, so delete by user)
      // In production: store the hash in a Redis set for fast deletion
      if (payload) {
        const redis = getRedis();
        await redis.del(`refresh:${payload.userId}:${refreshToken.substring(0, 20)}`);
      }
    } catch (err) {
      // Logout should never fail visibly
      logger.warn('Error during logout cleanup', { error: (err as Error).message });
    }
  }

  async refreshTokens(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new Error('Invalid or expired refresh token');
    }

    // Verify user still exists and is active
    const user = await userRepository.findByIdWithRole(payload.userId);
    if (!user || !user.is_active) {
      throw new Error('User account not found or deactivated');
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      roleName: user.role_name ?? 'User',
      roleId: user.role_id,
    };

    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await userRepository.findByIdWithRole(userId);
    if (!user) throw new Error('User not found');

    const valid = await comparePassword(oldPassword, user.password_hash);
    if (!valid) throw new Error('Current password is incorrect');

    const newHash = await hashPassword(newPassword);
    await userRepository.updateUser(userId, { password_hash: newHash });

    // Invalidate all sessions
    await userRepository.deleteAllUserSessions(userId);
    await this.clearPermissionCache(userId);

    logger.info('Password changed', { userId });
  }

  async initiatePasswordReset(email: string): Promise<string> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal whether email exists
      return generateToken(32);
    }

    const resetToken = generateToken(32);
    const redis = getRedis();
    await redis.setex(`pwd_reset:${resetToken}`, 3600, user.id); // 1 hour TTL

    logger.info('Password reset initiated', { userId: user.id });
    return resetToken;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const redis = getRedis();
    const userId = await redis.get(`pwd_reset:${token}`);
    if (!userId) throw new Error('Invalid or expired reset token');

    const newHash = await hashPassword(newPassword);
    await userRepository.updateUser(userId, { password_hash: newHash });
    await userRepository.deleteAllUserSessions(userId);
    await redis.del(`pwd_reset:${token}`);
    await this.clearPermissionCache(userId);

    logger.info('Password reset completed', { userId });
  }

  async getPermissions(userId: string): Promise<Array<{ module: string; submodule: string | null; action: string; granted: boolean }>> {
    const cacheKey = `perms:${userId}`;
    try {
      const redis = getRedis();
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      logger.warn('Failed to read permissions from Redis cache, falling back to DB', {
        userId,
        error: (err as Error).message,
      });
    }

    const permissions = await userRepository.getUserPermissions(userId);

    try {
      const redis = getRedis();
      await redis.setex(cacheKey, PERMISSION_CACHE_TTL, JSON.stringify(permissions));
    } catch {
      // Ignore cache write failures
    }

    return permissions;
  }

  async clearPermissionCache(userId: string): Promise<void> {
    try {
      const redis = getRedis();
      await redis.del(`perms:${userId}`);
    } catch {
      // Ignore cache clear failures
    }
  }

  async hasPermission(userId: string, roleName: string, module: string, submodule: string | null, action: string): Promise<boolean> {
    // Super Admin bypasses all permission checks
    if (roleName === 'Super Admin') return true;

    const permissions = await this.getPermissions(userId);
    return permissions.some(
      (p) =>
        p.module === module &&
        (p.submodule === submodule || p.submodule === 'all' || submodule === null) &&
        (p.action === action || p.action === 'all') &&
        p.granted
    );
  }
}

export const authService = new AuthService();

