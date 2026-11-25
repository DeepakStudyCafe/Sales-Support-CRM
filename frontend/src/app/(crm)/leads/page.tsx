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
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export default function LeadsPage() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.roleName === 'Super Admin';
  const [activeTab, setActiveTab] = useState<'all' | 'pipeline' | 'assignment' | 'sources' | 'lost'>('all');
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
    api.get('/users?limit=50').then((res) => {
      if (res.data?.success && res.data?.data) {
        setUsersList(res.data.data);
      }
    }).catch(() => {});
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
      cell: (lead: Lead) => (
        <div className="flex flex-col">
          <Link
            href={`/leads/${lead.id}`}
            className="font-medium text-foreground hover:text-primary hover:underline"
          >
            {lead.firstName} {lead.lastName}
          </Link>
          <span className="text-xs text-muted-foreground">{lead.company || 'Individual Prospect'}</span>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact Info',
      cell: (lead: Lead) => (
        <div className="flex flex-col text-xs">
          <span className="font-mono text-foreground">{lead.phone}</span>
          <span className="text-muted-foreground">{lead.email || '-'}</span>
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      cell: (lead: Lead) => (
        <span className="text-xs font-medium text-muted-foreground">
          {lead.source?.name || 'Website Direct'}
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
      cell: (lead: Lead) => (
        <span className="text-xs text-muted-foreground">{formatDate(lead.createdAt)}</span>
      ),
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
          onClick={() => setActiveTab('all')}
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

      {/* Main Leads Table with Full Bulk Operations */}
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

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        module="leads"
        onSuccess={() => {
          fetchLeads();
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
    </div>
  );
}
