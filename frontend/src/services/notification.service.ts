import api from './api'
import { ApiResponse, PaginationParams } from '@/types/api'
import { Notification } from '@/types/notification'

export const notificationService = {
  getNotifications: (params?: PaginationParams & { unreadOnly?: boolean }) =>
    api.get<ApiResponse<Notification[]>>('/notifications', { params }),

  markAsRead: (id: string) =>
    api.patch<ApiResponse>(`/notifications/${id}/read`),

  markAllAsRead: () =>
    api.patch<ApiResponse>('/notifications/read-all'),

  deleteNotification: (id: string) =>
    api.delete<ApiResponse>(`/notifications/${id}`),

  getUnreadCount: () =>
    api.get<ApiResponse<{ count: number }>>('/notifications/unread-count'),

  getNotificationSettings: () =>
    api.get<ApiResponse<Record<string, boolean>>>('/notifications/settings'),

  updateNotificationSettings: (settings: Record<string, boolean>) =>
    api.patch<ApiResponse>('/notifications/settings', settings),
}
