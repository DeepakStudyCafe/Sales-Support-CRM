export interface Customer {
  id: string
  leadId?: string
  firstName: string
  lastName: string
  fullName: string
  email?: string
  phone: string
  alternatePhone?: string
  companyName?: string
  designation?: string
  website?: string
  gstNumber?: string
  panNumber?: string
  address?: string
  city?: string
  state?: string
  country?: string
  pincode?: string
  assignedTo?: string
  assignedToUser?: {
    id: string
    fullName: string
    email: string
    avatarUrl?: string
  }
  teamId?: string
  tags?: string[]
  totalRevenue?: number
  totalOrders?: number
  lastOrderDate?: string
  notes?: string
  isActive: boolean
  createdBy: string
  createdByUser?: {
    id: string
    fullName: string
  }
  createdAt: string
  updatedAt: string
  lastActivityAt?: string
  ticketCount?: number
  openTicketCount?: number
}

export interface CustomerActivity {
  id: string
  customerId: string
  userId: string
  userFullName: string
  type: 'note' | 'call' | 'email' | 'meeting' | 'ticket' | 'purchase' | 'complaint'
  description: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface CreateCustomerRequest {
  firstName: string
  lastName: string
  email?: string
  phone: string
  alternatePhone?: string
  companyName?: string
  designation?: string
  website?: string
  gstNumber?: string
  panNumber?: string
  address?: string
  city?: string
  state?: string
  country?: string
  pincode?: string
  assignedTo?: string
  teamId?: string
  tags?: string[]
  notes?: string
}

export interface UpdateCustomerRequest extends Partial<CreateCustomerRequest> {
  id: string
}
