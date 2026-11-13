export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'waiting_customer'
  | 'waiting_internal'
  | 'resolved'
  | 'closed'
  | 'escalated'

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'

export interface Ticket {
  id: string
  ticketNumber: string
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  categoryId?: string
  categoryName?: string
  customerId?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  leadId?: string
  assignedTo?: string
  assignedToUser?: {
    id: string
    fullName: string
    email: string
    avatarUrl?: string
  }
  teamId?: string
  slaId?: string
  slaName?: string
  slaDueAt?: string
  isSlaBreached?: boolean
  resolvedAt?: string
  closedAt?: string
  escalatedAt?: string
  escalationReason?: string
  tags?: string[]
  attachments?: TicketAttachment[]
  createdBy: string
  createdByUser?: {
    id: string
    fullName: string
  }
  createdAt: string
  updatedAt: string
  lastActivityAt?: string
  replyCount?: number
}

export interface TicketAttachment {
  id: string
  ticketId: string
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  uploadedBy: string
  createdAt: string
}

export interface TicketReply {
  id: string
  ticketId: string
  userId: string
  userFullName: string
  userAvatarUrl?: string
  userRole: string
  message: string
  isInternal: boolean
  attachments?: TicketAttachment[]
  createdAt: string
  updatedAt: string
}

export interface TicketCategory {
  id: string
  name: string
  description?: string
  defaultPriority?: TicketPriority
  defaultSlaId?: string
  isActive: boolean
  createdAt: string
}

export interface SlaPolicy {
  id: string
  name: string
  description?: string
  responseTimeHours: number
  resolutionTimeHours: number
  isActive: boolean
  createdAt: string
}

export interface CreateTicketRequest {
  title: string
  description: string
  priority: TicketPriority
  categoryId?: string
  customerId?: string
  leadId?: string
  assignedTo?: string
  teamId?: string
  slaId?: string
  tags?: string[]
}

export interface UpdateTicketRequest extends Partial<CreateTicketRequest> {
  id: string
  status?: TicketStatus
  escalationReason?: string
}

export interface TicketFilter {
  status?: TicketStatus[]
  priority?: TicketPriority[]
  categoryId?: string[]
  assignedTo?: string[]
  teamId?: string
  dateFrom?: string
  dateTo?: string
  isSlaBreached?: boolean
}
