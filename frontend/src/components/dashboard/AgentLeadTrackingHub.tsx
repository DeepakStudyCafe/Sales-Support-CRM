"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ExcelImportModal } from '@/components/shared/ExcelImportModal';
import {
  Users,
  Building,
  Phone,
  PhoneCall,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  Sparkles,
  TrendingUp,
  Search,
  UserCheck,
  ChevronRight,
  Layers,
  FileSpreadsheet,
  Plus,
  MessageSquare,
  Calendar,
  RefreshCw,
  Eye,
  Check,
  Tag,
  ArrowLeft,
  FolderOpen,
} from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';

interface AgentLeadTrackingHubProps {
  className?: string;
}

export function AgentLeadTrackingHub({ className }: AgentLeadTrackingHubProps) {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.roleName === 'Super Admin' || currentUser?.roleName === 'Admin';

  const [users, setUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatchName, setSelectedBatchName] = useState<string | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Excel Upload Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Remarks edit state
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [editingNotesValue, setEditingNotesValue] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState<boolean>(false);

  // Follow-up modal state
  const [followUpModalOpen, setFollowUpModalOpen] = useState<boolean>(false);
  const [activeFollowUpLead, setActiveFollowUpLead] = useState<any>(null);
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [followUpNote, setFollowUpNote] = useState<string>('');
  const [isSchedulingFollowUp, setIsSchedulingFollowUp] = useState<boolean>(false);

  // Reassign Modal
  const [reassignModalOpen, setReassignModalOpen] = useState<boolean>(false);
  const [activeLeadToReassign, setActiveLeadToReassign] = useState<any>(null);
  const [targetAgentId, setTargetAgentId] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState<boolean>(false);

  // Quick Call state
  const [callingLeadId, setCallingLeadId] = useState<string | null>(null);

  // 1. Fetch active employees (uses /users/assignable with /users fallback)
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await api.get('/users/assignable')
          .catch(() => api.get('/users?limit=100&isActive=true'));
        if (res.data?.success && Array.isArray(res.data?.data)) {
          setUsers(res.data.data);
        }
      } catch (err: any) {
        console.error('Failed to fetch assignable employees', err);
      }
    }
    fetchUsers();
  }, []);

  // 2. Set default user if not Super Admin
  useEffect(() => {
    if (!isSuperAdmin && currentUser?.id) {
      setSelectedUserId(currentUser.id);
    }
  }, [isSuperAdmin, currentUser]);

  // 3. Fetch Batches for Selected Employee
  const fetchBatches = useCallback(async () => {
    setIsLoadingBatches(true);
    try {
      const params: any = {};
      if (selectedUserId !== 'all') {
        params.assignedTo = selectedUserId;
      }
      const res = await api.get('/leads/batches', { params });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setBatches(res.data.data);
      }
    } catch {
      // Fallback: continue without batches
    } finally {
      setIsLoadingBatches(false);
    }
  }, [selectedUserId]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // 4. Fetch leads based on selected user & selected batch
  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { limit: 100 };
      if (selectedUserId !== 'all') {
        params.assignedTo = selectedUserId;
      }
      if (selectedBatchName) {
        params.batchName = selectedBatchName;
      }
      const res = await api.get('/leads', { params });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setLeads(res.data.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [selectedUserId, selectedBatchName]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Handle instant status change
  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    try {
      const res = await api.put(`/leads/${leadId}`, { status: newStatus });
      if (res.data?.success) {
        toast.success(`Lead status updated to ${newStatus}`);
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
        );
        fetchBatches(); // Update counts in batch cards
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update lead status');
    }
  };

  // Handle saving remarks/notes
  const handleSaveRemarks = async (leadId: string) => {
    setIsSavingNotes(true);
    try {
      const res = await api.patch(`/leads/${leadId}/remarks`, {
        notes: editingNotesValue,
      });
      if (res.data?.success) {
        toast.success('Remarks saved successfully');
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, notes: editingNotesValue } : l))
        );
        setEditingNotesId(null);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save remarks');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Handle scheduling follow-up
  const handleExecuteFollowUp = async () => {
    if (!activeFollowUpLead || !followUpDate) {
      toast.error('Please select follow-up date and time');
      return;
    }
    setIsSchedulingFollowUp(true);
    try {
      const res = await api.patch(`/leads/${activeFollowUpLead.id}/remarks`, {
        notes: followUpNote || activeFollowUpLead.notes,
        followUpAt: new Date(followUpDate).toISOString(),
      });
      if (res.data?.success) {
        toast.success(`Follow-up scheduled for ${activeFollowUpLead.first_name}`);
        setFollowUpModalOpen(false);
        setActiveFollowUpLead(null);
        setFollowUpDate('');
        setFollowUpNote('');
        fetchLeads();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to schedule follow-up');
    } finally {
      setIsSchedulingFollowUp(false);
    }
  };

  // Handle single lead reassign
  const handleExecuteReassign = async () => {
    if (!activeLeadToReassign || !targetAgentId) return;
    setIsReassigning(true);
    try {
      const res = await api.patch(`/leads/${activeLeadToReassign.id}/assign`, {
        assignedTo: targetAgentId,
        reason: 'Live reassignment from Executive Lead Hub',
      });
      if (res.data?.success) {
        toast.success(`Lead reassigned successfully`);
        setReassignModalOpen(false);
        setActiveLeadToReassign(null);
        setTargetAgentId('');
        fetchLeads();
        fetchBatches();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reassign lead');
    } finally {
      setIsReassigning(false);
    }
  };

  // Quick call directly from table
  const handleQuickCall = async (lead: any) => {
    setCallingLeadId(lead.id);
    try {
      await api.post('/calls/click-to-call', {
        destinationNumber: lead.phone,
        leadId: lead.id,
      });
      toast.success(`Dialing ${lead.first_name} (${lead.phone}). Connecting to IVR...`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Telephony service unreachable');
    } finally {
      setCallingLeadId(null);
    }
  };

  // Filtered leads
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch =
        searchQuery === '' ||
        `${l.first_name || ''} ${l.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.phone && l.phone.includes(searchQuery)) ||
        (l.company && l.company.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (l.notes && l.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'all' || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [leads, searchQuery, statusFilter]);

  // Selected agent object
  const selectedAgentObj = users.find((u) => u.id === selectedUserId);

  // Compute metrics for active view
  const metrics = useMemo(() => {
    const total = leads.length;
    const contacted = leads.filter((l) => l.status === 'Contacted' || l.status === 'Follow-up').length;
    const interested = leads.filter((l) => l.status === 'Interested' || l.status === 'Qualified' || l.status === 'Proposal').length;
    const converted = leads.filter((l) => l.status === 'Converted').length;
    const lost = leads.filter((l) => l.status === 'Lost').length;
    return { total, contacted, interested, converted, lost };
  }, [leads]);

  return (
    <div className={`space-y-4 rounded-2xl border bg-card p-5 shadow-xs ${className}`}>
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {isSuperAdmin ? 'Employee Lead Tracking & Batch Hub' : 'My Assigned Leads & Calling Batches'}
            </h3>
            {selectedBatchName && (
              <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary text-xs gap-1 font-mono">
                <Tag className="h-3 w-3" /> Batch: {selectedBatchName}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isSuperAdmin
              ? 'Select any employee to view their assigned lead batches, inspect real-time progress, remarks, and follow-ups'
              : 'Work on your assigned lead batches, execute calls, update remarks and customer follow-ups'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Super Admin Employee Picker */}
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold text-foreground whitespace-nowrap">Employee:</Label>
              <Select
                value={selectedUserId}
                onValueChange={(val) => {
                  setSelectedUserId(val);
                  setSelectedBatchName(null);
                }}
              >
                <SelectTrigger className="h-9 text-xs w-56 font-medium">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">
                    <span className="font-semibold text-primary">All Employees (Company Wide)</span>
                  </SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold">{u.first_name} {u.last_name}</span>
                        <span className="text-[10px] text-muted-foreground">({u.role_name || 'Agent'})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Upload & Assign Excel Button */}
          {isSuperAdmin && (
            <Button
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Upload & Assign Leads Excel
            </Button>
          )}

          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            onClick={() => {
              fetchBatches();
              fetchLeads();
            }}
            title="Refresh leads and batch status"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading || isLoadingBatches ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="p-3 rounded-xl border bg-muted/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Leads</span>
          <p className="text-xl font-bold text-foreground mt-1">{metrics.total}</p>
        </div>
        <div className="p-3 rounded-xl border bg-blue-500/10 border-blue-500/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">Contacted / Calling</span>
          <p className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-1">{metrics.contacted}</p>
        </div>
        <div className="p-3 rounded-xl border bg-amber-500/10 border-amber-500/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Interested / Hot</span>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">{metrics.interested}</p>
        </div>
        <div className="p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/20">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Converted</span>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{metrics.converted}</p>
        </div>
        <div className="p-3 rounded-xl border bg-rose-500/10 border-rose-500/20 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Lost / Inactive</span>
          <p className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-1">{metrics.lost}</p>
        </div>
      </div>

      {/* LEAD BATCHES / LISTS CARDS (Level 1 View) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" />
            Assigned Lead Batches / Campaigns ({batches.length})
          </h4>
          {selectedBatchName && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedBatchName(null)}
              className="h-7 text-xs text-primary font-semibold gap-1"
            >
              <ArrowLeft className="h-3 w-3" /> Show All Batches
            </Button>
          )}
        </div>

        {isLoadingBatches ? (
          <div className="py-6 text-center text-xs text-muted-foreground">Loading assigned batches...</div>
        ) : batches.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground">
            No distinct lead batches found. Upload leads via Excel to organize by batch.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {batches.map((b) => {
              const isSelected = selectedBatchName === b.batch_name;
              const contactedPct = b.total_leads > 0 ? Math.round(((b.contacted_count + b.converted_count) / b.total_leads) * 100) : 0;
              return (
                <div
                  key={b.batch_name}
                  onClick={() => setSelectedBatchName(isSelected ? null : b.batch_name)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm'
                      : 'bg-card hover:border-primary/40 hover:bg-muted/20'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-bold text-xs text-foreground truncate">{b.batch_name}</span>
                      </div>
                      <Badge variant="secondary" className="font-mono text-[11px] font-bold shrink-0">
                        {b.total_leads} Leads
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1.5">
                      <UserCheck className="h-3 w-3 text-emerald-600" />
                      <span>Assigned to: <strong className="text-foreground">{b.assigned_to_name}</strong></span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground font-medium">
                      <span>Contacted / Processed</span>
                      <span className="font-mono font-bold text-primary">{contactedPct}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${contactedPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Batch breakdown badges */}
                  <div className="flex items-center justify-between pt-1 border-t text-[10px] text-muted-foreground">
                    <span className="text-blue-600 font-semibold">{b.contacted_count} Contacted</span>
                    <span className="text-amber-600 font-semibold">{b.interested_count} Interested</span>
                    <span className="text-emerald-600 font-bold">{b.converted_count} Converted</span>
                    <span className="text-rose-500 font-medium">{b.lost_count} Lost</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Search and Filters for Leads Table */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t">
        <div className="flex items-center gap-2 max-w-sm w-full">
          <Input
            placeholder="Search leads by name, phone, company, or remarks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Status:</Label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="Contacted">Contacted</SelectItem>
              <SelectItem value="Interested">Interested</SelectItem>
              <SelectItem value="Qualified">Qualified</SelectItem>
              <SelectItem value="Converted">Converted</SelectItem>
              <SelectItem value="Lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* LEADS TABLE (Level 2 View with Remarks, Follow-up, Call) */}
      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b text-muted-foreground font-semibold">
            <tr>
              <th className="py-2.5 px-3 text-left">Lead Contact</th>
              <th className="py-2.5 px-3 text-left">Batch / Source</th>
              <th className="py-2.5 px-3 text-left">Assigned To</th>
              <th className="py-2.5 px-3 text-center">Status</th>
              <th className="py-2.5 px-3 text-left">Remarks & Notes</th>
              <th className="py-2.5 px-3 text-right">Calling & Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  Loading leads...
                </td>
              </tr>
            ) : filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-muted-foreground">
                  No leads found matching current criteria.
                </td>
              </tr>
            ) : (
              filteredLeads.slice(0, 30).map((l) => (
                <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                  {/* Lead Contact */}
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col">
                      <Link href={`/leads/${l.id}`} className="font-bold text-primary hover:underline">
                        {l.first_name} {l.last_name || ''}
                      </Link>
                      <span className="text-[11px] text-foreground font-mono font-medium">{l.phone}</span>
                      <span className="text-[10px] text-muted-foreground">{l.company || 'Direct Contact'}</span>
                    </div>
                  </td>

                  {/* Batch & Source */}
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col gap-1">
                      {l.batch_name ? (
                        <Badge variant="outline" className="text-[10px] font-mono border-primary/30 text-primary w-fit">
                          {l.batch_name}
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Direct Inbound</span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(l.created_at)}
                      </span>
                    </div>
                  </td>

                  {/* Assigned Employee */}
                  <td className="py-2.5 px-3">
                    {l.assigned_to_name ? (
                      <Badge variant="secondary" className="font-medium text-[11px]">
                        <UserCheck className="h-3 w-3 mr-1 text-primary" />
                        {l.assigned_to_name}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-600 font-semibold text-[10px]">
                        Unassigned
                      </Badge>
                    )}
                  </td>

                  {/* Status Dropdown */}
                  <td className="py-2.5 px-3 text-center">
                    <Select
                      value={l.status || 'New'}
                      onValueChange={(val) => handleUpdateStatus(l.id, val)}
                    >
                      <SelectTrigger className="h-7 text-[11px] w-28 mx-auto font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New</SelectItem>
                        <SelectItem value="Contacted">Contacted</SelectItem>
                        <SelectItem value="Interested">Interested</SelectItem>
                        <SelectItem value="Qualified">Qualified</SelectItem>
                        <SelectItem value="Converted">Converted</SelectItem>
                        <SelectItem value="Lost">Lost</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Remarks & Notes */}
                  <td className="py-2.5 px-3 max-w-xs">
                    {editingNotesId === l.id ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={editingNotesValue}
                          onChange={(e) => setEditingNotesValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRemarks(l.id);
                          }}
                          placeholder="Add calling remark..."
                          className="h-7 text-xs flex-1"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-emerald-600"
                          onClick={() => handleSaveRemarks(l.id)}
                          disabled={isSavingNotes}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setEditingNotesId(l.id);
                          setEditingNotesValue(l.notes || '');
                        }}
                        className="cursor-pointer group flex items-start gap-1 p-1 rounded hover:bg-muted/50"
                        title="Click to edit remarks"
                      >
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary" />
                        <span className={`text-[11px] line-clamp-2 ${l.notes ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                          {l.notes || 'Click to add remark...'}
                        </span>
                      </div>
                    )}
                  </td>

                  {/* Calling & Actions */}
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Click to Call */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                        title="Click to Call"
                        disabled={callingLeadId === l.id}
                        onClick={() => handleQuickCall(l)}
                      >
                        <PhoneCall className="h-3.5 w-3.5" />
                      </Button>

                      {/* Schedule Follow-up */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                        title="Schedule Follow-up"
                        onClick={() => {
                          setActiveFollowUpLead(l);
                          setFollowUpNote(l.notes || '');
                          setFollowUpModalOpen(true);
                        }}
                      >
                        <Calendar className="h-3.5 w-3.5" />
                      </Button>

                      {/* Reassign (Super Admin) */}
                      {isSuperAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px] gap-1 font-medium"
                          onClick={() => {
                            setActiveLeadToReassign(l);
                            setReassignModalOpen(true);
                          }}
                        >
                          <ArrowRightLeft className="h-3 w-3" /> Transfer
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredLeads.length > 30 && (
        <div className="text-center pt-2">
          <Link href={`/leads?${selectedUserId !== 'all' ? `assignedTo=${selectedUserId}` : ''}${selectedBatchName ? `&batchName=${encodeURIComponent(selectedBatchName)}` : ''}`}>
            <Button variant="ghost" size="sm" className="text-xs text-primary font-semibold gap-1">
              View All {filteredLeads.length} Leads in Master Directory <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Schedule Follow-up Modal */}
      <Dialog open={followUpModalOpen} onOpenChange={setFollowUpModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-5 w-5 text-indigo-600" />
              Schedule Follow-up: {activeFollowUpLead?.first_name} {activeFollowUpLead?.last_name || ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold" required>Follow-up Date & Time</Label>
              <Input
                type="datetime-local"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Follow-up Remarks / Call Objective</Label>
              <Input
                placeholder="e.g. Call back for pricing discussion, send quote on WhatsApp"
                value={followUpNote}
                onChange={(e) => setFollowUpNote(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setFollowUpModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteFollowUp}
              isLoading={isSchedulingFollowUp}
              className="font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <CheckCircle2 className="h-4 w-4" /> Save Follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Lead Modal */}
      <Dialog open={reassignModalOpen} onOpenChange={setReassignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Reassign Lead: {activeLeadToReassign?.first_name} {activeLeadToReassign?.last_name || ''}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
              <span className="text-muted-foreground block">Currently Assigned To:</span>
              <span className="font-bold text-foreground">
                {activeLeadToReassign?.assigned_to_name || 'Unassigned'}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold" required>
                Select Target Employee (Admin, Sales, or Support)
              </Label>
              <Select value={targetAgentId} onValueChange={setTargetAgentId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose an employee..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.role_name || 'Agent'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setReassignModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleExecuteReassign}
              isLoading={isReassigning}
              className="font-semibold gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" /> Confirm Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Excel Import Modal */}
      <ExcelImportModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        module="leads"
        title="Upload & Assign Leads via Excel"
        onSuccess={() => {
          fetchBatches();
          fetchLeads();
        }}
      />
    </div>
  );
}
