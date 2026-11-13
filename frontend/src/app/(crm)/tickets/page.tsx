"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ExcelImportModal } from '@/components/shared/ExcelImportModal';
import { ExcelExportButton } from '@/components/shared/ExcelExportButton';
import { PaginationMeta } from '@/types/api';
import { formatDate } from '@/lib/utils';
import {
  Plus,
  Headphones,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  FileSpreadsheet,
  Flame,
  ListTodo,
  User,
  ShieldCheck,
  FolderTree,
  Archive,
} from 'lucide-react';
import api from '@/services/api';
import Link from 'next/link';
import { toast } from 'sonner';

export default function AllTicketsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'assigned' | 'sla' | 'categories' | 'resolved'>('all');
  const [tickets, setTickets] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAllFilteredSelected, setIsAllFilteredSelected] = useState(false);

  // Modals
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [isBulkStatusOpen, setIsBulkStatusOpen] = useState(false);
  const [targetAgentId, setTargetAgentId] = useState('');
  const [targetStatus, setTargetStatus] = useState('In Progress');
  const [agentsList, setAgentsList] = useState<any[]>([]);

  useEffect(() => {
    api.get('/users?limit=50').then((res) => {
      if (res.data?.success && res.data?.data) {
        setAgentsList(res.data.data);
      }
    }).catch(() => {});
  }, []);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined,
        search: searchQuery || undefined,
      };

      if (activeTab === 'resolved') params.status = 'Resolved';

      const res = await api.get('/tickets', { params });

      if (res.data.success && res.data.data) {
        setTickets(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load tickets');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, priorityFilter, searchQuery, activeTab]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Bulk Actions
  const handleBulkAssign = async () => {
    if (!targetAgentId) {
      toast.error('Please select an agent to assign');
      return;
    }
    try {
      const res = await api.post('/bulk/action', {
        module: 'tickets',
        action: 'assign',
        ids: selectedIds,
        payload: { assignedTo: targetAgentId },
      });
      toast.success(res.data?.message || `Assigned ${selectedIds.length} tickets.`);
      setIsBulkAssignOpen(false);
      setSelectedIds([]);
      fetchTickets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assign tickets');
    }
  };

  const handleBulkStatus = async () => {
    try {
      const res = await api.post('/bulk/action', {
        module: 'tickets',
        action: 'status',
        ids: selectedIds,
        payload: { status: targetStatus },
      });
      toast.success(res.data?.message || `Updated status for ${selectedIds.length} tickets.`);
      setIsBulkStatusOpen(false);
      setSelectedIds([]);
      fetchTickets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update ticket status');
    }
  };

  const handleBulkEscalate = async () => {
    try {
      const res = await api.post('/bulk/action', {
        module: 'tickets',
        action: 'escalate',
        ids: selectedIds,
      });
      toast.success(res.data?.message || `Escalated ${selectedIds.length} tickets to Critical SLA.`);
      setSelectedIds([]);
      fetchTickets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to escalate tickets');
    }
  };

  const handleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedIds([]);
      setIsAllFilteredSelected(false);
    } else {
      setSelectedIds(tickets.map((t) => t.id));
      setIsAllFilteredSelected(true);
      toast.info(`Selected all ${pagination.total} tickets matching filter.`);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      key: 'ticket_number',
      header: 'Ticket #',
      render: (t) => (
        <Link
          href={`/tickets/${t.id}`}
          className="font-mono text-xs font-bold text-primary hover:underline"
        >
          {t.ticket_number}
        </Link>
      ),
    },
    {
      key: 'title',
      header: 'Subject & Description',
      render: (t) => (
        <div className="flex flex-col">
          <Link
            href={`/tickets/${t.id}`}
            className="font-semibold text-xs text-foreground hover:underline line-clamp-1"
          >
            {t.title}
          </Link>
          <span className="text-[11px] text-muted-foreground line-clamp-1">
            {t.category_name || 'Technical'} • {t.customer_name || 'Enterprise Client'}
          </span>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (t) => <PriorityBadge priority={t.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <StatusBadge status={t.status} />,
    },
    {
      key: 'assigned_to',
      header: 'Assigned Agent',
      render: (t) => (
        <span className="text-xs text-muted-foreground">
          {t.assigned_to_name || 'Unassigned Queue'}
        </span>
      ),
    },
    {
      key: 'sla',
      header: 'Resolution Target',
      render: (t) => {
        const isBreached = t.resolution_due_at && new Date(t.resolution_due_at) < new Date() && t.status !== 'Resolved';
        return (
          <div className="flex items-center gap-1 text-xs">
            {isBreached && <AlertTriangle className="h-3 w-3 text-rose-500" />}
            <span className={isBreached ? 'text-rose-600 font-semibold' : 'text-muted-foreground'}>
              {t.resolution_due_at ? formatDate(t.resolution_due_at) : 'Standard SLA'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Created Date',
      render: (t) => (
        <span className="text-xs text-muted-foreground">{formatDate(t.created_at)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Support Tickets Hub"
        subtitle="Manage customer support inquiries, SLA targets, team assignments and customer resolution"
        breadcrumbs={[
          { label: 'Support', href: '/tickets' },
          { label: 'Tickets Hub' },
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

            <ExcelExportButton module="tickets" selectedIds={selectedIds} label="Export Excel" />

            <Link href="/tickets/create">
              <Button size="sm" className="h-9 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-3.5 w-3.5" /> Create Ticket
              </Button>
            </Link>
          </div>
        }
      />

      {/* Sub-module Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('all'); setPagination(p => ({ ...p, page: 1 })); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <Headphones className="h-3.5 w-3.5" />
          All Tickets
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
            {pagination.total}
          </span>
        </button>

        <Link href="/tickets/my">
          <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
            <User className="h-3.5 w-3.5" />
            My Tickets
          </button>
        </Link>

        <Link href="/tickets/assigned">
          <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
            <UserCheck className="h-3.5 w-3.5" />
            Assigned Queue
          </button>
        </Link>

        <Link href="/tickets/sla">
          <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
            <ShieldCheck className="h-3.5 w-3.5" />
            SLA & Escalations
          </button>
        </Link>

        <Link href="/tickets/categories">
          <button className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all">
            <FolderTree className="h-3.5 w-3.5" />
            Categories
          </button>
        </Link>

        <button
          onClick={() => { setActiveTab('resolved'); setPagination(p => ({ ...p, page: 1 })); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'resolved'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <Archive className="h-3.5 w-3.5" />
          Resolved & Closed
        </button>
      </div>

      {/* Tickets Table with Bulk Operations */}
      <DataTable
        columns={columns}
        data={tickets}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
        onSearch={(q) => {
          setSearchQuery(q);
          setPagination((prev) => ({ ...prev, page: 1 }));
        }}
        searchPlaceholder="Search ticket subject or number..."
        selectedIds={selectedIds}
        onSelectChange={setSelectedIds}
        onSelectAllFiltered={handleSelectAllFiltered}
        isAllFilteredSelected={isAllFilteredSelected}
        bulkActions={[
          {
            label: 'Assign Agent',
            icon: <UserCheck className="h-3.5 w-3.5" />,
            onClick: () => setIsBulkAssignOpen(true),
          },
          {
            label: 'Update Status',
            icon: <CheckCircle2 className="h-3.5 w-3.5" />,
            onClick: () => setIsBulkStatusOpen(true),
          },
          {
            label: 'Escalate to Critical',
            icon: <Flame className="h-3.5 w-3.5 text-rose-400" />,
            onClick: handleBulkEscalate,
          },
        ]}
        filterSlot={
          <div className="flex gap-2">
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <SelectTrigger className="w-[120px] h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Waiting for Customer">Waiting</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
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
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        module="tickets"
        onSuccess={() => {
          fetchTickets();
          toast.success('Tickets imported successfully!');
        }}
      />

      {/* Bulk Assign Dialog */}
      <Dialog open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <UserCheck className="h-5 w-5 text-indigo-600" />
              Reassign {selectedIds.length} Selected Tickets
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Support Agent</Label>
              <Select value={targetAgentId} onValueChange={setTargetAgentId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose support engineer..." />
                </SelectTrigger>
                <SelectContent>
                  {agentsList.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.first_name} {a.last_name} ({a.role_name || a.email})
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
              Update Status for {selectedIds.length} Tickets
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select New Ticket Status</Label>
              <Select value={targetStatus} onValueChange={setTargetStatus}>
                <SelectTrigger className="h-9 text-xs">
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
    </div>
  );
}
