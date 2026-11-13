import { hashPassword, generateToken } from '../utils/crypto';
import { userRepository, CreateUserInput } from '../repositories/user.repository';
import { roleRepository } from '../repositories/role.repository';
import { authService } from './auth.service';
import { notificationService } from './notification.service';
import { auditService } from './audit.service';
import { logger } from '../utils/logger';
import { getPaginationParams } from '../utils/pagination';

export interface CreateUserDTO {
  email: string;
  phone?: string;
  first_name: string;
  last_name: string;
  roleName: 'Admin' | 'Sales' | 'Support';
  team_id?: string;
  department_id?: string;
  ivr_agent_id?: string;
  ivr_extension?: string;
  password?: string; // If not provided, generates a temporary one
  createdBy: string;
}

export class UserService {
  async createUser(input: CreateUserDTO): Promise<{ user: Omit<CreateUserInput, 'password_hash'>; temporaryPassword?: string }> {
    // Check email uniqueness
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new Error(`A user with email ${input.email} already exists`);
    }

    // Find role
    const role = await roleRepository.findByName(input.roleName);
    if (!role) throw new Error(`Role '${input.roleName}' not found`);

    // Generate or hash password
    const temporaryPassword = input.password ?? `Temp@${generateToken(8)}`;
    const password_hash = await hashPassword(temporaryPassword);

    const userInput: CreateUserInput = {
      email: input.email.toLowerCase().trim(),
      phone: input.phone,
      password_hash,
      first_name: input.first_name,
      last_name: input.last_name,
      role_id: role.id,
      team_id: input.team_id,
      department_id: input.department_id,
      ivr_agent_id: input.ivr_agent_id,
      ivr_extension: input.ivr_extension,
      created_by: input.createdBy,
    };

    const user = await userRepository.createUser(userInput);

    await auditService.log({
      userId: input.createdBy,
      action: 'CREATE_USER',
      entityType: 'user',
      entityId: user.id,
      newValues: { email: user.email, role: input.roleName },
    });

    logger.info('User created', { userId: user.id, email: user.email, role: input.roleName });

    return {
      user: { ...userInput },
      temporaryPassword: input.password ? undefined : temporaryPassword,
    };
  }

  async updateUser(id: string, input: Partial<Omit<CreateUserDTO, 'email' | 'createdBy'>>, performedBy: string) {
    const existing = await userRepository.findByIdWithRole(id);
    if (!existing) throw new Error('User not found');

    let roleId: string | undefined;
    if (input.roleName) {
      const role = await roleRepository.findByName(input.roleName);
      if (!role) throw new Error(`Role '${input.roleName}' not found`);
      roleId = role.id;
    }

    const updated = await userRepository.updateUser(id, {
      phone: input.phone,
      first_name: input.first_name,
      last_name: input.last_name,
      role_id: roleId,
      team_id: input.team_id,
      department_id: input.department_id,
      ivr_agent_id: input.ivr_agent_id,
      ivr_extension: input.ivr_extension,
    });

    // Clear permission cache if role changed
    if (roleId && roleId !== existing.role_id) {
      await authService.clearPermissionCache(id);
    }

    await auditService.log({
      userId: performedBy,
      action: 'UPDATE_USER',
      entityType: 'user',
      entityId: id,
      oldValues: { role_id: existing.role_id },
      newValues: { role_id: roleId },
    });

    return updated;
  }

  async activateUser(id: string, performedBy: string) {
    const user = await userRepository.updateUser(id, { is_active: true });
    if (!user) throw new Error('User not found');
    await auditService.log({ userId: performedBy, action: 'ACTIVATE_USER', entityType: 'user', entityId: id });
    return user;
  }

  async deactivateUser(id: string, performedBy: string) {
    const user = await userRepository.updateUser(id, { is_active: false });
    if (!user) throw new Error('User not found');
    // Invalidate all sessions
    await userRepository.deleteAllUserSessions(id);
    await authService.clearPermissionCache(id);
    await auditService.log({ userId: performedBy, action: 'DEACTIVATE_USER', entityType: 'user', entityId: id });
    return user;
  }

  async resetUserPassword(id: string, performedBy: string): Promise<string> {
    const user = await userRepository.findByIdWithRole(id);
    if (!user) throw new Error('User not found');

    const tempPassword = `Reset@${generateToken(8)}`;
    const hash = await hashPassword(tempPassword);
    await userRepository.updateUser(id, { password_hash: hash });
    await userRepository.deleteAllUserSessions(id);
    await authService.clearPermissionCache(id);

    await auditService.log({
      userId: performedBy,
      action: 'RESET_USER_PASSWORD',
      entityType: 'user',
      entityId: id,
    });

    logger.info('User password reset', { targetUserId: id, performedBy });
    return tempPassword;
  }

  async listUsers(options: {
    page: number;
    limit: number;
    search?: string;
    roleId?: string;
    isActive?: boolean;
    teamId?: string;
    departmentId?: string;
  }) {
    return userRepository.findAll(options);
  }

  async getUserById(id: string) {
    const user = await userRepository.findByIdWithRole(id);
    if (!user) throw new Error('User not found');
    // Don't return password hash
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }
}

export const userService = new UserService();

