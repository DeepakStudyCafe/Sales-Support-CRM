import api from './api'
import { ApiResponse, PaginationParams } from '@/types/api'
import { Customer, CreateCustomerRequest, UpdateCustomerRequest, CustomerActivity } from '@/types/customer'

export const customerService = {
  getCustomers: (params?: PaginationParams) =>
    api.get<ApiResponse<Customer[]>>('/customers', { params }),

  getCustomer: (id: string) => api.get<ApiResponse<Customer>>(`/customers/${id}`),

  createCustomer: (data: CreateCustomerRequest) =>
    api.post<ApiResponse<Customer>>('/customers', data),

  updateCustomer: (id: string, data: Partial<UpdateCustomerRequest>) =>
    api.patch<ApiResponse<Customer>>(`/customers/${id}`, data),

  deleteCustomer: (id: string) => api.delete<ApiResponse>(`/customers/${id}`),

  getActivities: (id: string) =>
    api.get<ApiResponse<CustomerActivity[]>>(`/customers/${id}/activities`),

  addNote: (id: string, note: string) =>
    api.post<ApiResponse<CustomerActivity>>(`/customers/${id}/notes`, { note }),

  exportCustomers: (params?: PaginationParams) =>
    api.get('/customers/export', { params, responseType: 'blob' }),
}
