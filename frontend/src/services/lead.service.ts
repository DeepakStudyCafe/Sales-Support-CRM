import api from './api'
import { ApiResponse, PaginationParams } from '@/types/api'
import { Lead, CreateLeadRequest, UpdateLeadRequest, LeadActivity, LeadFilter } from '@/types/lead'

export const leadService = {
  getLeads: (params?: PaginationParams & LeadFilter) =>
    api.get<ApiResponse<Lead[]>>('/leads', { params }),

  getLead: (id: string) => api.get<ApiResponse<Lead>>(`/leads/${id}`),

  createLead: (data: CreateLeadRequest) => api.post<ApiResponse<Lead>>('/leads', data),

  updateLead: (id: string, data: Partial<UpdateLeadRequest>) =>
    api.patch<ApiResponse<Lead>>(`/leads/${id}`, data),

  deleteLead: (id: string) => api.delete<ApiResponse>(`/leads/${id}`),

  bulkDelete: (ids: string[]) =>
    api.post<ApiResponse>('/leads/bulk-delete', { ids }),

  bulkAssign: (ids: string[], assignedTo: string) =>
    api.post<ApiResponse>('/leads/bulk-assign', { ids, assignedTo }),

  bulkUpdateStatus: (ids: string[], status: string) =>
    api.post<ApiResponse>('/leads/bulk-status', { ids, status }),

  convertToCustomer: (id: string) =>
    api.post<ApiResponse<{ customerId: string }>>(`/leads/${id}/convert`),

  getLeadActivities: (id: string) =>
    api.get<ApiResponse<LeadActivity[]>>(`/leads/${id}/activities`),

  addNote: (id: string, note: string) =>
    api.post<ApiResponse<LeadActivity>>(`/leads/${id}/notes`, { note }),

  exportLeads: (params?: PaginationParams & LeadFilter) =>
    api.get('/leads/export', { params, responseType: 'blob' }),

  getSources: () => api.get<ApiResponse<{ id: string; name: string }[]>>('/leads/sources'),

  getPipelineStats: () =>
    api.get<ApiResponse<{ status: string; count: number; value: number }[]>>('/leads/pipeline'),
}
