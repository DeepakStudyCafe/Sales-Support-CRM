import api from './api'
import { ApiResponse, PaginationParams } from '@/types/api'
import { Ticket, CreateTicketRequest, UpdateTicketRequest, TicketReply, TicketCategory, SlaPolicy, TicketFilter } from '@/types/ticket'

export const ticketService = {
  getTickets: (params?: PaginationParams & TicketFilter) =>
    api.get<ApiResponse<Ticket[]>>('/tickets', { params }),

  getTicket: (id: string) => api.get<ApiResponse<Ticket>>(`/tickets/${id}`),

  createTicket: (data: CreateTicketRequest) =>
    api.post<ApiResponse<Ticket>>('/tickets', data),

  updateTicket: (id: string, data: Partial<UpdateTicketRequest>) =>
    api.patch<ApiResponse<Ticket>>(`/tickets/${id}`, data),

  deleteTicket: (id: string) => api.delete<ApiResponse>(`/tickets/${id}`),

  getReplies: (ticketId: string) =>
    api.get<ApiResponse<TicketReply[]>>(`/tickets/${ticketId}/replies`),

  addReply: (ticketId: string, message: string, isInternal: boolean = false) =>
    api.post<ApiResponse<TicketReply>>(`/tickets/${ticketId}/replies`, { message, isInternal }),

  escalateTicket: (id: string, reason: string) =>
    api.post<ApiResponse<Ticket>>(`/tickets/${id}/escalate`, { reason }),

  resolveTicket: (id: string, resolution: string) =>
    api.post<ApiResponse<Ticket>>(`/tickets/${id}/resolve`, { resolution }),

  closeTicket: (id: string) =>
    api.post<ApiResponse<Ticket>>(`/tickets/${id}/close`),

  reopenTicket: (id: string) =>
    api.post<ApiResponse<Ticket>>(`/tickets/${id}/reopen`),

  getCategories: () => api.get<ApiResponse<TicketCategory[]>>('/tickets/categories'),

  createCategory: (data: Partial<TicketCategory>) =>
    api.post<ApiResponse<TicketCategory>>('/tickets/categories', data),

  updateCategory: (id: string, data: Partial<TicketCategory>) =>
    api.patch<ApiResponse<TicketCategory>>(`/tickets/categories/${id}`, data),

  deleteCategory: (id: string) =>
    api.delete<ApiResponse>(`/tickets/categories/${id}`),

  getSLAPolicies: () => api.get<ApiResponse<SlaPolicy[]>>('/tickets/sla'),

  createSLAPolicy: (data: Partial<SlaPolicy>) =>
    api.post<ApiResponse<SlaPolicy>>('/tickets/sla', data),

  updateSLAPolicy: (id: string, data: Partial<SlaPolicy>) =>
    api.patch<ApiResponse<SlaPolicy>>(`/tickets/sla/${id}`, data),

  deleteSLAPolicy: (id: string) => api.delete<ApiResponse>(`/tickets/sla/${id}`),

  exportTickets: (params?: PaginationParams & TicketFilter) =>
    api.get('/tickets/export', { params, responseType: 'blob' }),
}
