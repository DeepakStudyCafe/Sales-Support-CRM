export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'converted'
  | 'lost'
  | 'on_hold'
  | 'New'
  | 'Contacted'
  | 'Qualified'
  | 'Proposal Sent'
  | 'Negotiating'
  | 'Converted'
  | 'Lost'

export type LeadPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent'
  | 'Low'
  | 'Medium'
  | 'High'
  | 'Urgent'
  | 'Critical'

export type LeadSourceType =
  | 'website'
  | 'referral'
  | 'cold_call'
  | 'email_campaign'
  | 'social_media'
  | 'trade_show'
  | 'inbound_call'
  | 'other'

export interface Lead {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email?: string
  phone: string
  alternatePhone?: string
  company?: string
  companyName?: string
  designation?: string
  website?: string
  address?: string
  city?: string
  state?: string
  country?: string
  pincode?: string
  source?: LeadSource
  sourceId?: string
  status: LeadStatus
  priority: LeadPriority
  assignedTo?: string
  assignedToUser?: {
    id: string
    fullName: string
    email: string
    avatarUrl?: string
  }
  teamId?: string
  tags?: string[]
  budget?: number
  expectedCloseDate?: string
  notes?: string
  lostReason?: string
  convertedAt?: string
  convertedCustomerId?: string
  createdBy?: string
  createdByUser?: {
    id: string
    fullName: string
  }
  createdAt: string
  updatedAt: string
  lastActivityAt?: string
  followUpCount?: number
  callCount?: number
}

export interface LeadFilter {
  status?: LeadStatus[] | LeadStatus | string
  priority?: LeadPriority[] | LeadPriority | string
  source?: LeadSource[] | string
  assignedTo?: string[] | string
  teamId?: string
  dateFrom?: string
  dateTo?: string
  city?: string
  state?: string
}

export interface CreateLeadRequest {
  firstName: string
  lastName: string
  email?: string
  phone: string
  alternatePhone?: string
  companyName?: string
  designation?: string
  website?: string
  address?: string
  city?: string
  state?: string
  country?: string
  pincode?: string
  source: LeadSource
  status?: LeadStatus
  priority?: LeadPriority
  assignedTo?: string
  teamId?: string
  tags?: string[]
  budget?: number
  expectedCloseDate?: string
  notes?: string
}

export interface UpdateLeadRequest extends Partial<CreateLeadRequest> {
  id: string
  lostReason?: string
}

export interface LeadActivity {
  id: string
  leadId: string
  userId: string
  userFullName: string
  type: 'note' | 'call' | 'email' | 'meeting' | 'status_change' | 'assignment' | 'follow_up'
  description: string
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface LeadSource {
  id: string
  name: string
  description?: string
  isActive: boolean
  createdAt: string
}
