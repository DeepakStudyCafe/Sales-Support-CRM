"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ExcelImportModal } from '@/components/shared/ExcelImportModal';
import { ExcelExportButton } from '@/components/shared/ExcelExportButton';
import { leadService } from '@/services/lead.service';
import { Lead } from '@/types/lead';
import { PaginationMeta } from '@/types/api';
import { formatDate } from '@/lib/utils';
import {
  Plus,
  Phone,
  Eye,
  Trash2,
  ArrowRightLeft,
  UserCheck,
  FileSpreadsheet,
  Users,
  Kanban,
  UserPlus,
  Compass,
  UserX,
  CheckCircle2,
  Clock,
  Loader2,
  Layers,
  FolderOpen,
  ArrowLeft,
  MessageSquare,
  Calendar,
  Check,
  Tag,
  Sparkles,
  X,
  Search,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export default function LeadsPage() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.roleName === 'Super Admin';
  const [activeTab, setActiveTab] = useState<'all' | 'batches' | 'pipeline' | 'assignment' | 'sources' | 'lost'>('all');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAllFilteredSelected, setIsAllFilteredSelected] = useState(false);

  // Batch Management States
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [batchLeads, setBatchLeads] = useState<any[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(false);
  const [isLoadingBatchLeads, setIsLoadingBatchLeads] = useState(false);
  const [batchEmployeeFilter, setBatchEmployeeFilter] = useState('all');
  const [batchSearch, setBatchSearch] = useState('');
  const [batchLeadSearch, setBatchLeadSearch] = useState('');
  const [batchLeadStatusFilter, setBatchLeadStatusFilter] = useState('all');
  const [editingBatchLeadId, setEditingBatchLeadId] = useState<string | null>(null);
  const [editingBatchLeadNotes, setEditingBatchLeadNotes] = useState<string>('');
  const [isSavingBatchNotes, setIsSavingBatchNotes] = useState(false);

  // Quick Follow-up Modal State
  const [quickFollowUpLead, setQuickFollowUpLead] = useState<any | null>(null);
  const [followUpTitle, setFollowUpTitle] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpType, setFollowUpType] = useState('Callback');
  const [followUpPriority, setFollowUpPriority] = useState('Medium');
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [isSchedulingFollowUp, setIsSchedulingFollowUp] = useState(false);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false);
  const [targetAgentId, setTargetAgentId] = useState('');
  const [targetStatus, setTargetStatus] = useState('Contacted');
  const [usersList, setUsersList] = useState<any[]>([]);

  // Quick call modal
  const [callingLead, setCallingLead] = useState<Lead | null>(null);
  const [didNumber, setDidNumber] = useState('');
  const [isCalling, setIsCalling] = useState(false);

  // Convert modal
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // Fetch Users for Bulk Assignment
  useEffect(() => {
    api.get('/users/assignable')
      .catch(() => api.get('/users?limit=100&isActive=true'))
      .then((res) => {
        if (res.data?.success && Array.isArray(res.data?.data)) {
          setUsersList(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  const fetchLeads = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await leadService.getLeads({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      });

      if (res.data.success && res.data.data) {
        setLeads(res.data.data);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch {
      toast.error('Failed to load leads list');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, searchQuery, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Fetch Batches
  const fetchBatches = useCallback(async () => {
    setIsLoadingBatches(true);
    try {
      const params: any = {};
      if (batchEmployeeFilter !== 'all') {
        params.assignedTo = batchEmployeeFilter;
      }
      const res = await api.get('/leads/batches', { params });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setBatches(res.data.data);
      }
    } catch {
      // ignore
    } finally {
      setIsLoadingBatches(false);
    }
  }, [batchEmployeeFilter]);

  // Fetch Leads for a specific batch
  const fetchBatchLeads = useCallback(async (batchName: string) => {
    setIsLoadingBatchLeads(true);
    try {
      const params: any = { limit: 100, batchName };
      if (batchEmployeeFilter !== 'all') {
        params.assignedTo = batchEmployeeFilter;
      }
      const res = await api.get('/leads', { params });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        setBatchLeads(res.data.data);
      }
    } catch {
      toast.error('Failed to load batch leads');
    } finally {
      setIsLoadingBatchLeads(false);
    }
  }, [batchEmployeeFilter]);

  useEffect(() => {
    if (activeTab === 'batches') {
      fetchBatches();
    }
  }, [activeTab, fetchBatches]);

  useEffect(() => {
    if (selectedBatch) {
      fetchBatchLeads(selectedBatch.batch_name);
    }
  }, [selectedBatch, fetchBatchLeads]);

  const handleUpdateBatchLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      const res = await api.put(`/leads/${leadId}`, { status: newStatus });
      if (res.data?.success) {
        toast.success(`Lead status updated to ${newStatus}`);
        setBatchLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
        fetchBatches();
        fetchLeads();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    }
  };

  const handleSaveBatchLeadRemarks = async (leadId: string) => {
    setIsSavingBatchNotes(true);
    try {
      const res = await api.patch(`/leads/${leadId}/remarks`, { notes: editingBatchLeadNotes });
      if (res.data?.success) {
        toast.success('Remarks saved');
        setBatchLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, notes: editingBatchLeadNotes } : l)));
        setEditingBatchLeadId(null);
      }
    } catch {
      toast.error('Failed to save remarks');
    } finally {
      setIsSavingBatchNotes(false);
    }
  };

  const openFollowUpModal = (lead: any) => {
    setQuickFollowUpLead(lead);
    const fullName = `${lead.first_name || lead.firstName || ''} ${lead.last_name || lead.lastName || ''}`.trim() || 'Lead';
    setFollowUpTitle(`Follow-up Callback: ${fullName}`);
    setFollowUpType('Callback');
    setFollowUpPriority('Medium');
    setFollowUpNotes(lead.notes || '');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    setFollowUpDate(tomorrow.toISOString().slice(0, 16));
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickFollowUpLead || !followUpDate) {
      toast.error('Please specify scheduled date and time');
      return;
    }
    setIsSchedulingFollowUp(true);
    try {
      const payload: any = {
        title: followUpTitle || `Callback with ${quickFollowUpLead.first_name || 'Lead'}`,
        type: followUpType || 'Callback',
        priority: followUpPriority || 'Medium',
        scheduledAt: new Date(followUpDate).toISOString(),
        leadId: quickFollowUpLead.id,
        description: followUpNotes || undefined,
        assignedTo: quickFollowUpLead.assigned_to || undefined,
      };
      const res = await api.post('/follow-ups', payload);
      if (res.data?.success) {
        toast.success('Follow-up scheduled successfully');
        setQuickFollowUpLead(null);
        setFollowUpTitle('');
        setFollowUpDate('');
        setFollowUpNotes('');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to schedule follow-up');
    } finally {
      setIsSchedulingFollowUp(false);
    }
  };

  // Handle Bulk Operations
  const handleBulkAssign = async () => {
    if (!targetAgentId) {
      toast.error('Please select an agent to assign');
      return;
    }
    try {
      const res = await api.post('/bulk/action', {
        module: 'leads',
        action: 'assign',
        ids: selectedIds,
        payload: { assignedTo: targetAgentId },
      });
      toast.success(res.data?.message || `Successfully assigned ${selectedIds.length} leads.`);
      setIsBulkAssignOpen(false);
      setSelectedIds([]);
      fetchLeads();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to bulk assign leads');
    }
  };

  const handleBulkStatus = async () => {
    try {
      const res = await api.post('/bulk/action', {
        module: 'leads',
        action: 'status',
        ids: selectedIds,
        payload: { status: targetStatus },
      });
      toast.success(res.data?.message || `Status updated for ${selectedIds.length} leads.`);
      setIsBulkStatusOpen(false);
      setSelectedIds([]);
      fetchLeads();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update lead status');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const res = await api.post('/bulk/action', {
        module: 'leads',
        action: 'delete',
        ids: selectedIds,
      });
      toast.success(res.data?.message || `Successfully deleted ${selectedIds.length} leads.`);
      setIsBulkDeleteOpen(false);
      setSelectedIds([]);
      fetchLeads();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete leads');
    }
  };

  const handleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedIds([]);
      setIsAllFilteredSelected(false);
    } else {
      setSelectedIds(leads.map((l) => l.id));
      setIsAllFilteredSelected(true);
      toast.info(`Selected all ${pagination.total} records matching current filter.`);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await leadService.deleteLead(deleteId);
      toast.success('Lead deleted successfully');
      setDeleteId(null);
      fetchLeads();
    } catch {
      toast.error('Failed to delete lead');
    }
  };

  const handleInitiateCall = async () => {
    if (!callingLead) return;
    setIsCalling(true);
    try {
      const res = await api.post('/calls/click-to-call', {
        customerPhone: callingLead.phone,
        did: didNumber || 'DEFAULT_DID',
        leadId: callingLead.id,
      });
      if (res.data.success) {
        toast.success('Click-to-call initiated via IVR Solutions', {
          description: `Dialing customer ${callingLead.phone}`,
        });
        setCallingLead(null);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to initiate call');
    } finally {
      setIsCalling(false);
    }
  };

  const handleConvertLead = async () => {
    if (!convertingLead) return;
    setIsConverting(true);
    try {
      const res = await leadService.convertToCustomer(convertingLead.id);
      if (res.data.success) {
        toast.success('Lead successfully converted to Customer 360');
        setConvertingLead(null);
        fetchLeads();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to convert lead');
    } finally {
      setIsConverting(false);
    }
  };

  const columns: ColumnDef<Lead>[] = [
    {
      key: 'name',
      header: 'Lead Name & Company',
      sortable: true,
      cell: (lead: Lead) => {
        const anyLead = lead as any;
        const fullName = `${anyLead.first_name || lead.firstName || ''} ${anyLead.last_name || lead.lastName || ''}`.trim() || 'Unnamed Lead';
        return (
          <div className="flex flex-col">
            <Link
              href={`/leads/${lead.id}`}
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {fullName}
            </Link>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground">{lead.company || anyLead.company || 'Individual Prospect'}</span>
              {anyLead.batch_name && (
                <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.2 rounded font-medium">
                  {anyLead.batch_name}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: 'phone',
      header: 'Contact Info',
      cell: (lead: Lead) => (
        <div className="flex flex-col text-xs">
          <span className="font-mono text-foreground">{lead.phone || (lead as any).phone}</span>
          <span className="text-muted-foreground">{lead.email || (lead as any).email || '-'}</span>
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      cell: (lead: Lead) => (
        <span className="text-xs font-medium text-muted-foreground">
          {(lead as any).source_name || lead.source?.name || 'Website Direct'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      cell: (lead: Lead) => <StatusBadge status={lead.status} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      cell: (lead: Lead) => <PriorityBadge priority={lead.priority} />,
    },
    {
      key: 'assignedTo',
      header: 'Assigned Agent',
      cell: (lead: Lead) => {
        const agentName = (lead as any).assigned_to_name || lead.assignedToUser?.fullName || (typeof lead.assignedTo === 'string' && lead.assignedTo.length < 25 ? lead.assignedTo : null);
        return (
          <span className="text-xs text-muted-foreground">
            {agentName || 'Unassigned'}
          </span>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Created Date',
      sortable: true,
      cell: (lead: Lead) => {
        const anyLead = lead as any;
        return (
          <span className="text-xs text-muted-foreground font-mono">
            {formatDate(anyLead.created_at || lead.createdAt)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (lead: Lead) => (
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            onClick={() => setCallingLead(lead)}
            title="Click-to-Call Customer"
          >
            <Phone className="h-4 w-4" />
          </Button>

          <Link href={`/leads/${lead.id}`}>
            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" title="View Lead Details">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>

          {lead.status !== 'Converted' && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
              onClick={() => setConvertingLead(lead)}
              title="Convert to Customer"
            >
              <UserCheck className="h-4 w-4" />
            </Button>
          )}

          {isSuperAdmin && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteId(lead.id)}
              title="Delete Lead (Admin Only)"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Leads Hub"
        subtitle="Manage prospective clients, qualification pipeline, automated assignment, and conversion tracking"
        breadcrumbs={[
          { label: 'Sales', href: '/leads' },
          { label: 'Leads Hub' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              className="h-9 gap-1.5 text-xs border-emerald-600/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" /> Import Excel
            </Button>

            <ExcelExportButton
              module="leads"
              selectedIds={selectedIds}
              label="Export Excel"
            />

            <Link href="/leads/add">
              <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-3.5 w-3.5" /> Add Lead
              </Button>
            </Link>
          </div>
        }
      />

      {/* Unified Tabbed Navigation Hub */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab('all');
            setSelectedBatch(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          All Leads
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
            {pagination.total}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('batches');
            setSelectedBatch(null);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'batches'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Lead Batches & Campaigns
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
            {batches.length}
          </span>
        </button>

        <Link href="/leads/pipeline">
          <button
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          >
            <Kanban className="h-3.5 w-3.5" />
            Pipeline Board
          </button>
        </Link>

        <Link href="/leads/assignment">
          <button
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Lead Assignment
          </button>
        </Link>

        <Link href="/leads/sources">
          <button
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          >
            <Compass className="h-3.5 w-3.5" />
            Lead Sources
          </button>
        </Link>

        <Link href="/leads/lost">
          <button
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
          >
            <UserX className="h-3.5 w-3.5" />
            Lost Leads & Winback
          </button>
        </Link>
      </div>

      {/* TAB 1: Main Leads Table (All Leads) */}
      {activeTab === 'all' && (
        <DataTable
          columns={columns}
          data={leads}
          pagination={pagination}
          isLoading={isLoading}
          onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
          onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
          onSearch={(q) => {
            setSearchQuery(q);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          searchPlaceholder="Search by name, phone, email or company..."
          selectedIds={selectedIds}
          onSelectChange={setSelectedIds}
          onSelectAllFiltered={handleSelectAllFiltered}
          isAllFilteredSelected={isAllFilteredSelected}
          bulkActions={[
            {
              label: 'Assign Agent',
              icon: <UserPlus className="h-3.5 w-3.5" />,
              onClick: () => setIsBulkAssignOpen(true),
            },
            {
              label: 'Change Status',
              icon: <CheckCircle2 className="h-3.5 w-3.5" />,
              onClick: () => setIsBulkStatusOpen(true),
            },
            ...(isSuperAdmin
              ? [
                  {
                    label: 'Delete Selected',
                    icon: <Trash2 className="h-3.5 w-3.5 text-rose-400" />,
                    variant: 'destructive' as const,
                    onClick: () => setIsBulkDeleteOpen(true),
                  },
                ]
              : []),
          ]}
          filterSlot={
            <div className="flex items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={(val) => {
                  setStatusFilter(val);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger className="w-[120px] h-9 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Assigned">Assigned</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                  <SelectItem value="Interested">Interested</SelectItem>
                  <SelectItem value="Qualified">Qualified</SelectItem>
                  <SelectItem value="Converted">Converted</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={priorityFilter}
                onValueChange={(val) => {
                  setPriorityFilter(val);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger className="w-[110px] h-9 text-xs">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
      )}

      {/* TAB 2: Dedicated Lead Batches & Campaigns View */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          {!selectedBatch ? (
            <>
              {/* Batches Overview KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl border bg-card shadow-xs">
                  <span className="text-xs text-muted-foreground">Total Batches / Campaigns</span>
                  <p className="text-2xl font-bold mt-1 text-foreground">{batches.length}</p>
                </div>
                <div className="p-4 rounded-xl border bg-card shadow-xs">
                  <span className="text-xs text-muted-foreground">Total Leads in Batches</span>
                  <p className="text-2xl font-bold mt-1 text-primary">
                    {batches.reduce((sum, b) => sum + (Number(b.total_leads) || 0), 0)}
                  </p>
                </div>
                <div className="p-4 rounded-xl border bg-card shadow-xs">
                  <span className="text-xs text-muted-foreground">Contacted / In-Progress</span>
                  <p className="text-2xl font-bold mt-1 text-amber-600">
                    {batches.reduce((sum, b) => sum + (Number(b.contacted_count) || 0) + (Number(b.interested_count) || 0), 0)}
                  </p>
                </div>
                <div className="p-4 rounded-xl border bg-card shadow-xs">
                  <span className="text-xs text-muted-foreground">Converted to Customers</span>
                  <p className="text-2xl font-bold mt-1 text-emerald-600">
                    {batches.reduce((sum, b) => sum + (Number(b.converted_count) || 0), 0)}
                  </p>
                </div>
              </div>

              {/* Filter and Action Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border bg-card shadow-xs">
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search batch or campaign name..."
                      value={batchSearch}
                      onChange={(e) => setBatchSearch(e.target.value)}
                      className="pl-9 h-9 text-xs"
                    />
                  </div>

                  {isSuperAdmin && (
                    <Select value={batchEmployeeFilter} onValueChange={setBatchEmployeeFilter}>
                      <SelectTrigger className="w-[180px] h-9 text-xs">
                        <SelectValue placeholder="Filter by Agent" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Agents / Employees</SelectItem>
                        {usersList.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.first_name} {u.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <Button
                  size="sm"
                  onClick={() => setIsImportModalOpen(true)}
                  className="h-9 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Upload New Lead Batch
                </Button>
              </div>

              {/* Batches Table */}
              {isLoadingBatches ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs">Loading lead batches...</span>
                </div>
              ) : batches.filter((b) => {
                  if (!batchSearch) return true;
                  return (b.batch_name || '').toLowerCase().includes(batchSearch.toLowerCase()) ||
                    (b.assigned_to_name || '').toLowerCase().includes(batchSearch.toLowerCase());
                }).length === 0 ? (
                <div className="p-12 text-center border rounded-xl bg-card">
                  <p className="text-sm font-semibold text-foreground">No lead batches found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click "Upload New Lead Batch" to import an Excel sheet assigned to an agent.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/40 text-muted-foreground">
                          <th className="p-3 font-semibold">Batch / Campaign Name</th>
                          <th className="p-3 font-semibold">Assigned Employee</th>
                          <th className="p-3 font-semibold text-center">Total Leads</th>
                          <th className="p-3 font-semibold">Working Progress</th>
                          <th className="p-3 font-semibold">Status Breakdown</th>
                          <th className="p-3 font-semibold">Created Date</th>
                          <th className="p-3 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {batches
                          .filter((b) => {
                            if (!batchSearch) return true;
                            return (b.batch_name || '').toLowerCase().includes(batchSearch.toLowerCase()) ||
                              (b.assigned_to_name || '').toLowerCase().includes(batchSearch.toLowerCase());
                          })
                          .map((b, idx) => {
                            const total = Number(b.total_leads) || 0;
                            const worked = (Number(b.contacted_count) || 0) + (Number(b.interested_count) || 0) + (Number(b.converted_count) || 0) + (Number(b.lost_count) || 0);
                            const pct = total > 0 ? Math.round((worked / total) * 100) : 0;

                            return (
                              <tr key={idx} className="hover:bg-muted/30 transition-colors">
                                <td className="p-3">
                                  <div className="flex items-center gap-2 font-medium text-foreground">
                                    <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                                    <span className="font-semibold">{b.batch_name}</span>
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted text-foreground">
                                    {b.assigned_to_name || 'Unassigned'}
                                  </span>
                                </td>
                                <td className="p-3 text-center font-bold font-mono text-foreground">
                                  {total}
                                </td>
                                <td className="p-3 min-w-[140px]">
                                  <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                                    <span>{pct}% worked</span>
                                    <span>{worked}/{total}</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary rounded-full transition-all"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                </td>
                                <td className="p-3">
                                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                                    <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 font-mono">
                                      New: {b.new_count || 0}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-mono">
                                      Contacted: {b.contacted_count || 0}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 font-mono">
                                      Interested: {b.interested_count || 0}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono">
                                      Converted: {b.converted_count || 0}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-3 text-muted-foreground font-mono">
                                  {formatDate(b.last_created_at || b.first_created_at)}
                                </td>
                                <td className="p-3 text-right">
                                  <Button
                                    size="sm"
                                    onClick={() => setSelectedBatch(b)}
                                    className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                                  >
                                    <FolderOpen className="h-3.5 w-3.5" />
                                    View Leads ({total})
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Selected Batch Drill-Down Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card shadow-xs">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedBatch(null)}
                    className="h-8 gap-1.5 text-xs"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Batches
                  </Button>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-foreground flex items-center gap-1.5">
                        <FolderOpen className="h-4 w-4 text-primary" />
                        {selectedBatch.batch_name}
                      </h3>
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                        {batchLeads.length} Total Leads
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Assigned Agent: <strong className="text-foreground">{selectedBatch.assigned_to_name || 'Unassigned'}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsImportModalOpen(true)}
                    className="h-8 gap-1.5 text-xs text-emerald-600 border-emerald-600/30 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Import More into Batch
                  </Button>
                </div>
              </div>

              {/* Batch Status Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="p-3 rounded-lg border bg-muted/30">
                  <span className="text-[11px] text-muted-foreground">New / Unworked</span>
                  <p className="text-lg font-bold text-sky-600 mt-0.5">
                    {batchLeads.filter((l) => l.status === 'New').length}
                  </p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <span className="text-[11px] text-muted-foreground">Contacted</span>
                  <p className="text-lg font-bold text-amber-600 mt-0.5">
                    {batchLeads.filter((l) => l.status === 'Contacted').length}
                  </p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <span className="text-[11px] text-muted-foreground">Interested / Qualified</span>
                  <p className="text-lg font-bold text-indigo-600 mt-0.5">
                    {batchLeads.filter((l) => ['Interested', 'Qualified'].includes(l.status)).length}
                  </p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <span className="text-[11px] text-muted-foreground">Converted</span>
                  <p className="text-lg font-bold text-emerald-600 mt-0.5">
                    {batchLeads.filter((l) => l.status === 'Converted').length}
                  </p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <span className="text-[11px] text-muted-foreground">Lost</span>
                  <p className="text-lg font-bold text-rose-600 mt-0.5">
                    {batchLeads.filter((l) => l.status === 'Lost').length}
                  </p>
                </div>
              </div>

              {/* Search & Filter for batch leads */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search leads by name, phone, company..."
                    value={batchLeadSearch}
                    onChange={(e) => setBatchLeadSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Select value={batchLeadStatusFilter} onValueChange={setBatchLeadStatusFilter}>
                    <SelectTrigger className="w-[140px] h-9 text-xs">
                      <SelectValue placeholder="Status Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stages ({batchLeads.length})</SelectItem>
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

              {/* Batch Leads Table */}
              {isLoadingBatchLeads ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs">Loading leads for {selectedBatch.batch_name}...</span>
                </div>
              ) : batchLeads.filter((l) => {
                  const fullName = `${l.first_name || ''} ${l.last_name || ''}`.toLowerCase();
                  const phone = (l.phone || '').toLowerCase();
                  const company = (l.company || '').toLowerCase();
                  const email = (l.email || '').toLowerCase();
                  const q = batchLeadSearch.toLowerCase();
                  const matchesSearch = !q || fullName.includes(q) || phone.includes(q) || company.includes(q) || email.includes(q);
                  const matchesStatus = batchLeadStatusFilter === 'all' || l.status === batchLeadStatusFilter;
                  return matchesSearch && matchesStatus;
                }).length === 0 ? (
                <div className="p-12 text-center border rounded-xl bg-card">
                  <p className="text-sm font-semibold text-foreground">No leads found in this batch</p>
                  <p className="text-xs text-muted-foreground mt-1">Try clearing your search query or status filter.</p>
                </div>
              ) : (
                <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/40 text-muted-foreground">
                          <th className="p-3 font-semibold w-10">#</th>
                          <th className="p-3 font-semibold">Lead Name & Company</th>
                          <th className="p-3 font-semibold">Contact Info</th>
                          <th className="p-3 font-semibold w-36">Live Status / Stage</th>
                          <th className="p-3 font-semibold">Remarks & Calling Notes</th>
                          <th className="p-3 font-semibold text-right w-44">Quick Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {batchLeads
                          .filter((l) => {
                            const fullName = `${l.first_name || ''} ${l.last_name || ''}`.toLowerCase();
                            const phone = (l.phone || '').toLowerCase();
                            const company = (l.company || '').toLowerCase();
                            const email = (l.email || '').toLowerCase();
                            const q = batchLeadSearch.toLowerCase();
                            const matchesSearch = !q || fullName.includes(q) || phone.includes(q) || company.includes(q) || email.includes(q);
                            const matchesStatus = batchLeadStatusFilter === 'all' || l.status === batchLeadStatusFilter;
                            return matchesSearch && matchesStatus;
                          })
                          .map((lead, index) => {
                            const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unnamed Lead';
                            const isEditing = editingBatchLeadId === lead.id;

                            return (
                              <tr key={lead.id} className="hover:bg-muted/30 transition-colors">
                                <td className="p-3 text-muted-foreground font-mono">{index + 1}</td>
                                <td className="p-3">
                                  <Link
                                    href={`/leads/${lead.id}`}
                                    className="font-medium text-foreground hover:text-primary hover:underline block"
                                  >
                                    {fullName}
                                  </Link>
                                  <span className="text-[11px] text-muted-foreground">
                                    {lead.company || 'Individual Prospect'}
                                    {lead.city && ` • ${lead.city}`}
                                  </span>
                                </td>
                                <td className="p-3 font-mono">
                                  <div className="flex items-center gap-1.5 text-foreground font-semibold">
                                    {lead.phone}
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 text-emerald-600 hover:bg-emerald-50 rounded"
                                      onClick={() => setCallingLead(lead)}
                                      title="Call immediately"
                                    >
                                      <Phone className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                  <span className="text-[11px] text-muted-foreground font-sans block">{lead.email || '-'}</span>
                                </td>
                                <td className="p-3">
                                  <Select
                                    value={lead.status || 'New'}
                                    onValueChange={(newVal) => handleUpdateBatchLeadStatus(lead.id, newVal)}
                                  >
                                    <SelectTrigger className="h-8 text-xs font-medium">
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
                                <td className="p-3 max-w-xs">
                                  {isEditing ? (
                                    <div className="flex items-center gap-1.5">
                                      <Input
                                        value={editingBatchLeadNotes}
                                        onChange={(e) => setEditingBatchLeadNotes(e.target.value)}
                                        placeholder="Add remarks..."
                                        className="h-8 text-xs"
                                        autoFocus
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleSaveBatchLeadRemarks(lead.id);
                                          if (e.key === 'Escape') setEditingBatchLeadId(null);
                                        }}
                                      />
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 shrink-0"
                                        onClick={() => handleSaveBatchLeadRemarks(lead.id)}
                                        disabled={isSavingBatchNotes}
                                        title="Save Remarks"
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-muted-foreground hover:bg-muted shrink-0"
                                        onClick={() => setEditingBatchLeadId(null)}
                                        title="Cancel"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div
                                      className="group flex items-center justify-between gap-2 p-1.5 rounded hover:bg-muted/60 cursor-pointer"
                                      onClick={() => {
                                        setEditingBatchLeadId(lead.id);
                                        setEditingBatchLeadNotes(lead.notes || '');
                                      }}
                                      title="Click to edit remarks"
                                    >
                                      <span className="text-xs text-foreground truncate block max-w-[200px]">
                                        {lead.notes || <span className="text-muted-foreground italic">Add calling remarks...</span>}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 font-mono">
                                        Edit
                                      </span>
                                    </div>
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                                      onClick={() => setCallingLead(lead)}
                                      title="Click-to-Call Customer"
                                    >
                                      <Phone className="h-4 w-4" />
                                    </Button>

                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700"
                                      onClick={() => openFollowUpModal(lead)}
                                      title="Schedule Follow-up Task"
                                    >
                                      <Calendar className="h-4 w-4" />
                                    </Button>

                                    <Link href={`/leads/${lead.id}`}>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                        title="View Full Lead Details"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </Link>

                                    {lead.status !== 'Converted' && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                                        onClick={() => setConvertingLead(lead)}
                                        title="Convert to Customer"
                                      >
                                        <UserCheck className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        module="leads"
        onSuccess={() => {
          fetchLeads();
          fetchBatches();
          if (selectedBatch) {
            fetchBatchLeads(selectedBatch.batch_name);
          }
          toast.success('Leads imported successfully! Table refreshed.');
        }}
      />

      {/* Bulk Assign Dialog */}
      <Dialog open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <UserPlus className="h-5 w-5 text-indigo-600" />
              Bulk Assign {selectedIds.length} Selected Leads
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Target Sales Agent</Label>
              <Select value={targetAgentId} onValueChange={setTargetAgentId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose sales representative..." />
                </SelectTrigger>
                <SelectContent>
                  {usersList.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.first_name} {u.last_name} ({u.role_name || u.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsBulkAssignOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleBulkAssign} className="bg-primary text-xs">
              Confirm Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Dialog */}
      <Dialog open={isBulkStatusOpen} onOpenChange={setIsBulkStatusOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <CheckCircle2 className="h-5 w-5 text-indigo-600" />
              Update Status for {selectedIds.length} Leads
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select New Stage / Status</Label>
              <Select value={targetStatus} onValueChange={setTargetStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                  <SelectItem value="Interested">Interested</SelectItem>
                  <SelectItem value="Qualified">Qualified</SelectItem>
                  <SelectItem value="Lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsBulkStatusOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleBulkStatus} className="bg-primary text-xs">
              Apply Status Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <ConfirmDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        title={`Delete ${selectedIds.length} Selected Leads`}
        description={`Are you sure you want to permanently delete these ${selectedIds.length} leads? This action will remove associated records and activity history.`}
        confirmLabel="Confirm Bulk Delete"
        variant="destructive"
        onConfirm={handleBulkDelete}
      />

      {/* Single Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Lead Record"
        description="Are you sure you want to delete this lead? This action is soft-deleted and can be recovered by an administrator."
        confirmLabel="Delete Lead"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* Click-to-Call Modal */}
      <Dialog open={!!callingLead} onOpenChange={(open) => !open && setCallingLead(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-emerald-600" />
              Initiate Click-to-Call
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="rounded-lg bg-muted/60 p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">
                {callingLead?.firstName} {callingLead?.lastName}
              </p>
              <p className="text-muted-foreground">Destination Phone: {callingLead?.phone}</p>
              {callingLead?.company && <p className="text-muted-foreground">Company: {callingLead.company}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="did" className="text-xs">
                Caller ID / DID Number
              </Label>
              <Input
                id="did"
                placeholder="Enter approved company DID (or use assigned agent DID)"
                value={didNumber}
                onChange={(e) => setDidNumber(e.target.value)}
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Connecting via official IVR Solutions bridge API. Your extension phone will ring first.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCallingLead(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 font-semibold gap-1.5"
              onClick={handleInitiateCall}
              isLoading={isCalling}
            >
              <Phone className="h-3.5 w-3.5" /> Call Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Customer Modal */}
      <Dialog open={!!convertingLead} onOpenChange={(open) => !open && setConvertingLead(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-purple-600" />
              Convert Lead to Customer 360
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3 text-sm">
            <p className="text-muted-foreground text-xs leading-relaxed">
              Converting this lead will create an active Customer account, preserve all previous
              activity history, call records, and quotations, and mark the lead stage as Converted.
            </p>
            <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground">
                {convertingLead?.firstName} {convertingLead?.lastName}
              </p>
              <p className="text-muted-foreground">Phone: {convertingLead?.phone}</p>
              <p className="text-muted-foreground">Email: {convertingLead?.email || 'N/A'}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setConvertingLead(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              onClick={handleConvertLead}
              isLoading={isConverting}
            >
              Confirm & Convert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Schedule Follow-up Dialog */}
      <Dialog open={!!quickFollowUpLead} onOpenChange={(open) => !open && setQuickFollowUpLead(null)}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleScheduleFollowUp}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Calendar className="h-5 w-5 text-amber-600" />
                Schedule Follow-up Task / Callback
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="rounded-lg bg-muted/60 p-3 text-xs space-y-1">
                <p className="font-semibold text-foreground">
                  Lead: {quickFollowUpLead?.first_name || quickFollowUpLead?.firstName} {quickFollowUpLead?.last_name || quickFollowUpLead?.lastName || ''}
                </p>
                <p className="text-muted-foreground">Phone: {quickFollowUpLead?.phone}</p>
                {quickFollowUpLead?.company && (
                  <p className="text-muted-foreground">Company: {quickFollowUpLead.company}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Task Title</Label>
                <Input
                  value={followUpTitle}
                  onChange={(e) => setFollowUpTitle(e.target.value)}
                  placeholder="e.g. Discuss proposal callback"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Activity Type</Label>
                  <Select value={followUpType} onValueChange={setFollowUpType}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Callback">Callback</SelectItem>
                      <SelectItem value="Call">Call</SelectItem>
                      <SelectItem value="Meeting">Meeting</SelectItem>
                      <SelectItem value="Demo">Demo</SelectItem>
                      <SelectItem value="Task">Task</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Priority</Label>
                  <Select value={followUpPriority} onValueChange={setFollowUpPriority}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Scheduled Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Notes / Agenda</Label>
                <Input
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="Points to discuss during follow-up..."
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setQuickFollowUpLead(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs"
                disabled={isSchedulingFollowUp}
              >
                {isSchedulingFollowUp ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Scheduling...
                  </>
                ) : (
                  'Confirm & Schedule Task'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
