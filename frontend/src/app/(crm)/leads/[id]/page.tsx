"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { formatDate } from '@/lib/utils';
import {
  Phone,
  Mail,
  Building,
  MapPin,
  Calendar,
  UserCheck,
  Plus,
  Clock,
  History,
  Send,
  ArrowLeft,
} from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import Link from 'next/link';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Note
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Status update
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Click-to-Call modal
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [didNumber, setDidNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);

  // Schedule follow-up modal
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [followUpTitle, setFollowUpTitle] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const fetchLeadData = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const res = await api.get(`/leads/${id}`);
      if (res.data.success && res.data.data) {
        setLead(res.data.data);
        setActivities(res.data.data.activities || []);
      }
    } catch {
      toast.error('Failed to load lead details');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLeadData();
  }, [fetchLeadData]);

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await api.put(`/leads/${id}`, { status: newStatus });
      if (res.data.success) {
        toast.success(`Status updated to ${newStatus}`);
        setLead((prev: any) => ({ ...prev, status: newStatus }));
        fetchLeadData();
      }
    } catch {
      toast.error('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsSubmittingNote(true);
    try {
      const res = await api.put(`/leads/${id}`, {
        notes: lead.notes ? `${lead.notes}\n---\n${newNote}` : newNote,
      });
      if (res.data.success) {
        toast.success('Note added');
        setNewNote('');
        fetchLeadData();
      }
    } catch {
      toast.error('Failed to save note');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleInitiateCall = async () => {
    setIsCalling(true);
    try {
      const res = await api.post('/calls/click-to-call', {
        customerPhone: lead.phone,
        did: didNumber || 'DEFAULT_DID',
        leadId: lead.id,
      });
      if (res.data.success) {
        toast.success('Call initiated via IVR Solutions');
        setCallModalOpen(false);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Call initiation failed');
    } finally {
      setIsCalling(false);
    }
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpTitle || !followUpDate) return;

    setIsScheduling(true);
    try {
      const res = await api.post('/follow-ups', {
        title: followUpTitle,
        scheduledAt: new Date(followUpDate).toISOString(),
        assignedTo: lead.assigned_to,
        leadId: lead.id,
        type: 'Callback',
      });
      if (res.data.success) {
        toast.success('Follow-up task scheduled successfully');
        setFollowUpModalOpen(false);
        setFollowUpTitle('');
        setFollowUpDate('');
      }
    } catch {
      toast.error('Failed to schedule follow-up');
    } finally {
      setIsScheduling(false);
    }
  };

  const handleConvertToCustomer = async () => {
    try {
      const res = await api.patch(`/leads/${id}/convert`, {});
      if (res.data.success) {
        toast.success('Lead converted to Customer 360');
        router.push(`/customers/${res.data.data.customerId}`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to convert lead');
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="lg" text="Loading lead record..." />;
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold">Lead record not found</h3>
        <Link href="/leads">
          <Button variant="outline" className="mt-4">
            Back to Leads
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl pb-16">
      <PageHeader
        title={`${lead.first_name} ${lead.last_name || ''}`}
        subtitle={`Lead ID: ${lead.id.slice(0, 8)} • Source: ${lead.source_name || 'Direct'}`}
        breadcrumbs={[
          { label: 'Sales', href: '/leads' },
          { label: 'All Leads', href: '/leads' },
          { label: `${lead.first_name} ${lead.last_name || ''}` },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/leads">
              <Button variant="outline" size="sm" className="h-9 gap-1 text-xs">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Button>
            </Link>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 h-9 gap-1.5 text-xs font-semibold"
              onClick={() => setCallModalOpen(true)}
            >
              <Phone className="h-3.5 w-3.5" /> Click to Call
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 text-xs"
              onClick={() => {
                setFollowUpTitle(`Follow up with ${lead.first_name}`);
                setFollowUpModalOpen(true);
              }}
            >
              <Calendar className="h-3.5 w-3.5" /> Schedule Follow-up
            </Button>
            {lead.status !== 'Converted' && (
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white h-9 gap-1.5 text-xs font-semibold"
                onClick={handleConvertToCustomer}
              >
                <UserCheck className="h-3.5 w-3.5" /> Convert to Customer
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Lead Info Card */}
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Lead Status</CardTitle>
                <PriorityBadge priority={lead.priority} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Update Stage</Label>
                <Select
                  value={lead.status}
                  onValueChange={handleStatusChange}
                  disabled={isUpdatingStatus}
                >
                  <SelectTrigger className="w-full h-9 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Assigned">Assigned</SelectItem>
                    <SelectItem value="Contacted">Contacted</SelectItem>
                    <SelectItem value="Interested">Interested</SelectItem>
                    <SelectItem value="Follow-up">Follow-up</SelectItem>
                    <SelectItem value="Qualified">Qualified</SelectItem>
                    <SelectItem value="Converted">Converted</SelectItem>
                    <SelectItem value="Lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-3 space-y-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-semibold text-foreground">{lead.phone}</span>
                </div>
                {lead.alt_phone && (
                  <div className="flex items-center gap-2 pl-5 text-muted-foreground">
                    Alt: {lead.alt_phone}
                  </div>
                )}
                {lead.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{lead.email}</span>
                  </div>
                )}
                {lead.company && (
                  <div className="flex items-center gap-2">
                    <Building className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>{lead.company}</span>
                  </div>
                )}
                {(lead.city || lead.state) && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>
                      {lead.city} {lead.state ? `, ${lead.state}` : ''}
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t pt-3 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned Agent:</span>
                  <span className="font-medium text-foreground">
                    {lead.assigned_to_name || 'Unassigned'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lead Source:</span>
                  <span className="font-medium text-foreground">{lead.source_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created Date:</span>
                  <span className="text-muted-foreground">{formatDate(lead.created_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Notes Card */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Notes & Background</CardTitle>
            </CardHeader>
            <CardContent>
              {lead.notes ? (
                <div className="rounded-lg bg-muted/40 p-3 text-xs whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                  {lead.notes}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No notes recorded yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Columns (2 spans): Activity Timeline & Log Note */}
        <div className="lg:col-span-2 space-y-6">
          {/* Add Interaction Note Form */}
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Log Interaction / Add Note</CardTitle>
            </CardHeader>
            <form onSubmit={handleAddNote}>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Record summary of call, customer requirements or next steps..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 gap-1.5 text-xs font-semibold"
                    isLoading={isSubmittingNote}
                  >
                    <Send className="h-3 w-3" /> Save Note
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>

          {/* Activity Timeline */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <CardTitle className="text-base font-semibold">Activity Timeline</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Complete audit trail of calls, status changes, assignments and notes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  No activity records logged yet for this lead
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {activities.map((act) => (
                    <div key={act.id} className="relative group">
                      <div className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background" />
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                          {act.activity_type}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(act.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{act.description}</p>
                      {act.performed_by_name && (
                        <p className="text-[11px] text-foreground font-medium mt-0.5">
                          by {act.performed_by_name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Click-to-Call Dialog */}
      <Dialog open={callModalOpen} onOpenChange={setCallModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-emerald-600" />
              Call {lead.first_name} {lead.last_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/60 p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">{lead.first_name} {lead.last_name}</p>
              <p className="text-muted-foreground">Destination: {lead.phone}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="callDid" className="text-xs">
                Caller DID Number
              </Label>
              <Input
                id="callDid"
                placeholder="Approved company DID (optional)"
                value={didNumber}
                onChange={(e) => setDidNumber(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCallModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
              onClick={handleInitiateCall}
              isLoading={isCalling}
            >
              <Phone className="h-3.5 w-3.5" /> Connect Call Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Follow-up Dialog */}
      <Dialog open={followUpModalOpen} onOpenChange={setFollowUpModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Schedule Follow-up Task
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleScheduleFollowUp}>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="fuTitle" className="text-xs" required>
                  Task Title
                </Label>
                <Input
                  id="fuTitle"
                  value={followUpTitle}
                  onChange={(e) => setFollowUpTitle(e.target.value)}
                  placeholder="e.g. Discuss revised quote proposal"
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fuDate" className="text-xs" required>
                  Scheduled Date & Time (IST)
                </Label>
                <Input
                  id="fuDate"
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setFollowUpModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" isLoading={isScheduling} className="font-semibold">
                Set Reminder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

