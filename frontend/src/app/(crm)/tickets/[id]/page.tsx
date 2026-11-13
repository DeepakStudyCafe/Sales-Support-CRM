"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils';
import {
  Headphones,
  User,
  Clock,
  Send,
  Lock,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Building,
  Mail,
  ChevronLeft
} from 'lucide-react';
import api from '@/services/api';
import Link from 'next/link';
import { toast } from 'sonner';

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New message form state
  const [newMessage, setNewMessage] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Status updating state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingAssignee, setIsUpdatingAssignee] = useState(false);

  const fetchTicketDetails = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.get(`/tickets/${ticketId}`);
      if (res.data.success && res.data.data) {
        const data = res.data.data;
        setTicket(data);
        setMessages(data.messages || []);
        setActivities(data.activities || []);
      }
    } catch {
      toast.error('Failed to load ticket details');
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users', { params: { limit: 100 } });
      if (res.data.success && res.data.data) {
        setUsers(res.data.data);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (ticketId) {
      fetchTicketDetails();
      fetchUsers();
    }
  }, [ticketId, fetchTicketDetails]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      const res = await api.post(`/tickets/${ticketId}/messages`, {
        message: newMessage.trim(),
        isInternal: isInternalNote,
      });

      if (res.data.success) {
        toast.success(isInternalNote ? 'Internal note added' : 'Reply sent');
        setNewMessage('');
        fetchTicketDetails();
      }
    } catch {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket || ticket.status === newStatus) return;
    setIsUpdatingStatus(true);
    try {
      const res = await api.patch(`/tickets/${ticketId}/status`, { status: newStatus });
      if (res.data.success) {
        toast.success(`Status updated to ${newStatus}`);
        setTicket((prev: any) => ({ ...prev, status: newStatus }));
        fetchTicketDetails();
      }
    } catch {
      toast.error('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    if (!ticket || ticket.assigned_to === newAssigneeId) return;
    setIsUpdatingAssignee(true);
    try {
      const res = await api.patch(`/tickets/${ticketId}/assign`, { assignedTo: newAssigneeId });
      if (res.data.success) {
        toast.success('Ticket reassigned successfully');
        fetchTicketDetails();
      }
    } catch {
      toast.error('Failed to reassign ticket');
    } finally {
      setIsUpdatingAssignee(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-3" />
        <h2 className="text-xl font-semibold mb-2">Ticket Not Found</h2>
        <p className="text-muted-foreground mb-4">The ticket requested does not exist or you do not have permission to view it.</p>
        <Button onClick={() => router.push('/tickets')}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Tickets
        </Button>
      </div>
    );
  }

  const isOverdue = ticket.resolution_due_at && new Date(ticket.resolution_due_at) < new Date() && !['Resolved', 'Closed'].includes(ticket.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" onClick={() => router.push('/tickets')} className="h-8 px-2 text-muted-foreground">
              <ChevronLeft className="h-4 w-4 mr-1" /> Tickets
            </Button>
            <span className="text-xs text-muted-foreground">/</span>
            <span className="font-mono text-sm font-semibold text-primary">{ticket.ticket_number}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            {ticket.title}
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            {isOverdue && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400 px-2.5 py-0.5 text-xs font-medium">
                <AlertTriangle className="h-3.5 w-3.5" /> SLA Overdue
              </span>
            )}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {ticket.status !== 'Resolved' && (
            <Button
              variant="outline"
              className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              onClick={() => handleStatusChange('Resolved')}
              disabled={isUpdatingStatus}
            >
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Mark Resolved
            </Button>
          )}
        </div>
      </div>

      {/* SLA Status Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">First Response SLA</p>
              <p className="text-sm font-semibold">
                {ticket.first_responded_at
                  ? `Responded on ${formatDate(ticket.first_responded_at)}`
                  : ticket.first_response_due_at
                  ? `Due: ${formatDate(ticket.first_response_due_at)}`
                  : 'No SLA specified'}
              </p>
            </div>
          </div>
          {ticket.first_responded_at ? (
            <span className="text-xs text-emerald-600 font-medium">Met</span>
          ) : ticket.first_response_due_at && new Date(ticket.first_response_due_at) < new Date() ? (
            <span className="text-xs text-red-600 font-medium">Breached</span>
          ) : (
            <span className="text-xs text-muted-foreground">Pending</span>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Resolution SLA</p>
              <p className="text-sm font-semibold">
                {ticket.resolved_at
                  ? `Resolved on ${formatDate(ticket.resolved_at)}`
                  : ticket.resolution_due_at
                  ? `Due: ${formatDate(ticket.resolution_due_at)}`
                  : 'No SLA specified'}
              </p>
            </div>
          </div>
          {ticket.resolved_at ? (
            <span className="text-xs text-emerald-600 font-medium">Resolved</span>
          ) : isOverdue ? (
            <span className="text-xs text-red-600 font-medium">Overdue</span>
          ) : (
            <span className="text-xs text-muted-foreground">On Track</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column: Description, Conversation Thread & Reply Box */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Description */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                Ticket Description
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {ticket.description || 'No description provided.'}
            </CardContent>
          </Card>

          {/* Messages & Notes Thread */}
          <Card>
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Conversation Thread ({messages.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {messages.length === 0 ? (
                <p className="text-sm text-center py-6 text-muted-foreground">No replies or notes recorded yet.</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-lg p-4 border text-sm transition-colors ${
                      msg.is_internal
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-card border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/50">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{msg.sent_by_name || 'Agent'}</span>
                        {msg.is_internal && (
                          <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-xs font-medium">
                            <Lock className="h-3 w-3" /> Internal Note
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(msg.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">{msg.message}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Send Reply or Internal Note Form */}
          <Card>
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Add Response</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={!isInternalNote ? 'default' : 'outline'}
                    onClick={() => setIsInternalNote(false)}
                    className="h-7 text-xs"
                  >
                    Public Reply
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={isInternalNote ? 'default' : 'outline'}
                    onClick={() => setIsInternalNote(true)}
                    className="h-7 text-xs gap-1"
                  >
                    <Lock className="h-3 w-3" /> Internal Note
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSendMessage} className="space-y-4">
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={
                    isInternalNote
                      ? 'Write a private note for your team (not visible to customer)...'
                      : 'Write a response to the customer...'
                  }
                  rows={4}
                  className={isInternalNote ? 'border-amber-500/50 focus-visible:ring-amber-500' : ''}
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    {isInternalNote ? '🔒 Only internal team members can view this note.' : '✉️ This reply is part of customer record.'}
                  </p>
                  <Button type="submit" disabled={isSending || !newMessage.trim()} className="gap-1.5">
                    <Send className="h-4 w-4" />
                    {isSending ? 'Sending...' : isInternalNote ? 'Add Note' : 'Send Reply'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Activity Audit Log */}
          {activities.length > 0 && (
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base">Audit & Activity Log</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {activities.map((act) => (
                    <div key={act.id} className="flex items-start gap-3 text-xs">
                      <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <span className="font-medium text-foreground">{act.performed_by_name || 'System'}: </span>
                        <span className="text-muted-foreground">{act.description}</span>
                      </div>
                      <span className="text-muted-foreground shrink-0">{formatDate(act.created_at)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar: Ticket Properties & Customer 360 */}
        <div className="space-y-6">
          {/* Quick Properties */}
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Ticket Properties</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-sm">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Status</label>
                <Select value={ticket.status} onValueChange={handleStatusChange} disabled={isUpdatingStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Waiting for Customer">Waiting for Customer</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Assigned Agent</label>
                <Select
                  value={ticket.assigned_to || 'unassigned'}
                  onValueChange={(val) => handleAssigneeChange(val === 'unassigned' ? '' : val)}
                  disabled={isUpdatingAssignee}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.first_name} {u.last_name} ({u.role_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 border-t space-y-2 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium">{ticket.category_name || 'General Support'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">{formatDate(ticket.created_at)}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="font-medium">{formatDate(ticket.updated_at || ticket.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Profile Card */}
          {ticket.customer_id && (
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    Customer Details
                  </span>
                  <Link href={`/customers/${ticket.customer_id}`} className="text-xs text-primary hover:underline font-normal">
                    View Profile &rarr;
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-foreground">{ticket.customer_name || 'Customer'}</p>
                </div>
                {ticket.customer_email && (
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <Mail className="h-3.5 w-3.5" />
                    <span>{ticket.customer_email}</span>
                  </div>
                )}
                {ticket.customer_phone && (
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{ticket.customer_phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Associated Call / Lead */}
          {ticket.lead_id && (
            <Card>
              <CardHeader className="pb-2 border-b">
                <CardTitle className="text-sm">Associated Lead</CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs">
                <Link href={`/leads/${ticket.lead_id}`} className="text-primary hover:underline font-medium">
                  View Associated Lead &rarr;
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

