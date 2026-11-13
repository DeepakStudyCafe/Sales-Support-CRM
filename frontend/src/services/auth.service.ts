import api from './api'
import { ApiResponse } from '@/types/api'
import { User, LoginRequest, AuthTokens, ChangePasswordRequest } from '@/types/auth'

export const authService = {
  login: (data: LoginRequest) =>
    api.post<ApiResponse<{ user: User; tokens: AuthTokens }>>('/auth/login', data),

  logout: () => api.post<ApiResponse>('/auth/logout'),

  refreshToken: (refreshToken: string) =>
    api.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken }),

  getMe: () => api.get<ApiResponse<User>>('/auth/me'),

  changePassword: (data: ChangePasswordRequest) =>
    api.post<ApiResponse>('/auth/change-password', data),

  forgotPassword: (email: string) =>
    api.post<ApiResponse>('/auth/forgot-password', { email }),

  resetPassword: (token: string, password: string) =>
    api.post<ApiResponse>('/auth/reset-password', { token, password }),
}
