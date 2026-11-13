export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  body?: string
  data?: {
    entityType?: string
    entityId?: string
    action?: string
    url?: string
  }
  isRead: boolean
  readAt?: string
  createdAt: string
}

export type NotificationType =
  | 'lead_assigned'
  | 'lead_status_changed'
  | 'ticket_created'
  | 'ticket_assigned'
  | 'ticket_replied'
  | 'ticket_escalated'
  | 'follow_up_due'
  | 'follow_up_overdue'
  | 'call_missed'
  | 'call_completed'
  | 'campaign_started'
  | 'campaign_ended'
  | 'system_alert'
  | 'user_mention'
