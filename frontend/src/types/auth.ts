export interface User {
  id: string
  email: string
  phone?: string
  firstName: string
  lastName: string
  fullName: string
  roleId: string
  roleName: 'Super Admin' | 'Admin' | 'Sales' | 'Support'
  teamId?: string
  departmentId?: string
  ivrAgentId?: string
  ivrExtension?: string
  isActive: boolean
  avatarUrl?: string
  createdAt: string
  lastLoginAt?: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  permissions: Permission[]
}

export interface Permission {
  id: string
  module: string
  submodule?: string
  action: string
  granted: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}
