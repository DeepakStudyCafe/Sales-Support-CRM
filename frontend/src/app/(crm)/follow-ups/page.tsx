"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { DataTable, ColumnDef } from '@/components/tables/DataTable';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExcelExportButton } from '@/components/shared/ExcelExportButton';
import { PaginationMeta } from '@/types/api';
import { formatDate } from '@/lib/utils';
import {
  Plus,
  CheckCircle,
  Calendar,
  Clock,
  AlertTriangle,
  UserCheck,
  Trash2,
  CalendarClock,
  ListTodo,
  CalendarDays,
  CheckCheck,
} from 'lucide-react';
import api from '@/services/api';
import { toast } from 'sonner';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function FollowUpsPage() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.roleName === 'Super Admin';
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'completed'>('all');
  const [tasks, setTasks] = useState<any[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAllFilteredSelected, setIsAllFilteredSelected] = useState(false);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [targetAgentId, setTargetAgentId] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    type: 'Task',
    priority: 'Medium',
    scheduledAt: '',
    assignedTo: '',
  });

  const [users, setUsers] = useState<any[]>([]);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (activeTab === 'today') params.dueToday = 'true';
      if (activeTab === 'upcoming') params.upcoming = 'true';
      if (activeTab === 'overdue') params.overdue = 'true';
      if (activeTab === 'completed') params.status = 'Completed';

      const res = await api.get('/follow-ups', { params });

      if (res.data.success && res.data.data) {
        setTasks(res.data.data);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, activeTab]);

  useEffect(() => {
    fetchTasks();
    async function loadUsers() {
      try {
        const res = await api.get('/users?limit=100');
        if (res.data.success && res.data.data) {
          setUsers(res.data.data);
        }
      } catch {
        // Ignored
      }
    }
    loadUsers();
  }, [fetchTasks]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.scheduledAt) return;
    setIsSubmitting(true);
    try {
      await api.post('/follow-ups', formData);
      toast.success('Task scheduled successfully');
      setModalOpen(false);
      setFormData({
        title: '',
        type: 'Task',
        priority: 'Medium',
        scheduledAt: '',
        assignedTo: '',
      });
      fetchTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteSingle = async (id: string) => {
    try {
      await api.patch(`/follow-ups/${id}/complete`);
      toast.success('Task marked as completed');
      fetchTasks();
    } catch {
      toast.error('Failed to complete task');
    }
  };

  // Bulk Operations
  const handleBulkComplete = async () => {
    try {
      const res = await api.post('/bulk/action', {
        module: 'follow-ups',
        action: 'complete',
        ids: selectedIds,
      });
      toast.success(res.data?.message || `Marked ${selectedIds.length} tasks as completed.`);
      setSelectedIds([]);
      fetchTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to complete tasks');
    }
  };

  const handleBulkAssign = async () => {
    if (!targetAgentId) {
      toast.error('Please select an agent');
      return;
    }
    try {
      const res = await api.post('/bulk/action', {
        module: 'follow-ups',
        action: 'assign',
        ids: selectedIds,
        payload: { assignedTo: targetAgentId },
      });
      toast.success(res.data?.message || `Assigned ${selectedIds.length} tasks.`);
      setIsBulkAssignOpen(false);
      setSelectedIds([]);
      fetchTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to assign tasks');
    }
  };

  const handleBulkDelete = async () => {
    try {
      const res = await api.post('/bulk/action', {
        module: 'follow-ups',
        action: 'delete',
        ids: selectedIds,
      });
      toast.success(res.data?.message || `Deleted ${selectedIds.length} tasks.`);
      setIsBulkDeleteOpen(false);
      setSelectedIds([]);
      fetchTasks();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete tasks');
    }
  };

  const handleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedIds([]);
      setIsAllFilteredSelected(false);
    } else {
      setSelectedIds(tasks.map((t) => t.id));
      setIsAllFilteredSelected(true);
      toast.info(`Selected all ${pagination.total} tasks matching filter.`);
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      key: 'title',
      header: 'Task / Follow-up',
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground text-xs">{row.title}</span>
          <span className="text-[11px] text-muted-foreground">{row.type}</span>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      cell: (row) => <PriorityBadge priority={row.priority} />,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'scheduledAt',
      header: 'Scheduled Due (IST)',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{formatDate(row.scheduled_at)}</span>
        </div>
      ),
    },
    {
      key: 'assignedTo',
      header: 'Assigned Agent',
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.assigned_to_name || 'Enterprise Agent'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {row.status !== 'Completed' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCompleteSingle(row.id)}
              className="h-7 gap-1 text-[11px] text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
            >
              <CheckCircle className="h-3.5 w-3.5" /> Complete
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title="Tasks & Follow-ups Hub"
        subtitle="Manage client callbacks, sales meetings, product demos, and SLA reminders"
        breadcrumbs={[
          { label: 'Sales', href: '/follow-ups' },
          { label: 'Follow-ups Hub' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <ExcelExportButton module="follow-ups" selectedIds={selectedIds} label="Export Tasks" />
            <Button
              size="sm"
              onClick={() => setModalOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="h-3.5 w-3.5" /> New Task
            </Button>
          </div>
        }
      />

      {/* Unified Tabbed Navigation Hub */}
      <div className="flex items-center gap-2 border-b border-border pb-1 overflow-x-auto">
        <button
          onClick={() => { setActiveTab('all'); setPagination(p => ({ ...p, page: 1 })); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <ListTodo className="h-3.5 w-3.5" />
          All Tasks
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
            {pagination.total}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('today'); setPagination(p => ({ ...p, page: 1 })); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'today'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <Clock className="h-3.5 w-3.5 text-amber-500" />
          Today's Due
        </button>

        <button
          onClick={() => { setActiveTab('upcoming'); setPagination(p => ({ ...p, page: 1 })); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'upcoming'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <CalendarDays className="h-3.5 w-3.5 text-blue-500" />
          Upcoming
        </button>

        <button
          onClick={() => { setActiveTab('overdue'); setPagination(p => ({ ...p, page: 1 })); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'overdue'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
          Overdue
        </button>

        <button
          onClick={() => { setActiveTab('completed'); setPagination(p => ({ ...p, page: 1 })); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'completed'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
          }`}
        >
          <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />
          Completed
        </button>
      </div>

      {/* Tasks Table with Bulk Operations */}
      <DataTable
        columns={columns}
        data={tasks}
        pagination={pagination}
        isLoading={isLoading}
        onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        onLimitChange={(l) => setPagination((prev) => ({ ...prev, limit: l, page: 1 }))}
        selectedIds={selectedIds}
        onSelectChange={setSelectedIds}
        onSelectAllFiltered={handleSelectAllFiltered}
        isAllFilteredSelected={isAllFilteredSelected}
        bulkActions={[
          {
            label: 'Mark Completed',
            icon: <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />,
            onClick: handleBulkComplete,
          },
          {
            label: 'Assign Agent',
            icon: <UserCheck className="h-3.5 w-3.5" />,
            onClick: () => setIsBulkAssignOpen(true),
          },
          ...(isSuperAdmin
            ? [
                {
                  label: 'Delete Tasks',
                  icon: <Trash2 className="h-3.5 w-3.5 text-rose-400" />,
                  variant: 'destructive' as const,
                  onClick: () => setIsBulkDeleteOpen(true),
                },
              ]
            : []),
        ]}
      />

      {/* Bulk Assign Dialog */}
      <Dialog open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <UserCheck className="h-5 w-5 text-indigo-600" />
              Reassign {selectedIds.length} Tasks
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Select Target Agent</Label>
              <Select value={targetAgentId} onValueChange={setTargetAgentId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choose representative..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.first_name} {u.last_name}
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

      {/* Bulk Delete Confirm */}
      <ConfirmDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        title={`Delete ${selectedIds.length} Tasks`}
        description="Are you sure you want to permanently delete these selected tasks?"
        confirmLabel="Confirm Delete"
        variant="destructive"
        onConfirm={handleBulkDelete}
      />

      {/* Create Task Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Create Follow-up Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="tTitle" className="text-xs" required>
                  Task Description
                </Label>
                <Input
                  id="tTitle"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. Call customer to verify quote items"
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, type: val }))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Task">Task</SelectItem>
                      <SelectItem value="Call">Call</SelectItem>
                      <SelectItem value="Meeting">Meeting</SelectItem>
                      <SelectItem value="Demo">Demo</SelectItem>
                      <SelectItem value="Follow-up">Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(val) => setFormData((prev) => ({ ...prev, priority: val }))}
                  >
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
                <Label htmlFor="tTime" className="text-xs" required>
                  Scheduled Date & Time (IST)
                </Label>
                <Input
                  id="tTime"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData((prev) => ({ ...prev, scheduledAt: e.target.value }))}
                  className="h-9 text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Assign Agent</Label>
                <Select
                  value={formData.assignedTo}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, assignedTo: val }))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" isLoading={isSubmitting} className="font-semibold bg-primary text-xs">
                Save Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
